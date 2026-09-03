import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import { pool } from "../config/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function migrate() {
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await pool.query(schema);
  await pool.query(`
    ALTER TABLE sales ADD COLUMN IF NOT EXISTS signature TEXT;
    ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS product_type VARCHAR(80);
    ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS variant VARCHAR(120);
    ALTER TABLE receipt_counter ADD COLUMN IF NOT EXISTS last_date VARCHAR(8) NOT NULL DEFAULT '';
    ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_check;
    ALTER TABLE products ALTER COLUMN category TYPE VARCHAR(80);
    ALTER TABLE sale_items ALTER COLUMN product_type TYPE VARCHAR(120);
  `);
  await pool.query(`
    UPDATE sales
    SET customer_phone = '0541855747'
    WHERE customer_phone IS NULL OR BTRIM(customer_phone) = '';
  `);

  // Seed default admin user if none exists
  const { rows: userRows } = await pool.query("SELECT COUNT(*)::int AS count FROM users");
  if (userRows[0].count === 0) {
    const hash = await bcrypt.hash("admin1234", 12);
    await pool.query(
      "INSERT INTO users (username, password_hash, role) VALUES ($1, $2, 'admin')",
      ["admin", hash]
    );
    console.log("Default user created → username: admin  password: admin1234");
  }

  const shopProducts = [
    [
      "Ikeda b/s",
      "All Kinds of fragrance (Room, Laundry, Wardrobes, Car, Body etc)",
      "12pcs per pack",
      0,
      null,
      100,
      10,
    ],
    [
      "Ikeda s/s",
      "All Kinds of fragrance (Room, Laundry, Wardrobes, Car, Body etc)",
      "12pcs per pack",
      0,
      null,
      100,
      10,
    ],
  ];

  for (const product of shopProducts) {
    await pool.query(
      `INSERT INTO products
        (name, category, variant, selling_price, cost_price, stock_quantity, low_stock_threshold)
       SELECT $1::varchar, $2::varchar, $3::varchar, $4::numeric, $5::numeric, $6::integer, $7::integer
       WHERE NOT EXISTS (
         SELECT 1 FROM products
         WHERE LOWER(name) = LOWER($1::varchar)
           AND LOWER(COALESCE(variant, '')) = LOWER($3::varchar)
       )`,
      product
    );
  }

  await pool.query("DELETE FROM products WHERE LOWER(name) NOT LIKE 'ikeda%'");
}

export async function waitForDatabase(retries = 20, delayMs = 1000) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch (error) {
      if (attempt === retries) {
        throw new Error(
          `Could not connect to PostgreSQL after ${retries} attempts. ${error.message}`
        );
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
