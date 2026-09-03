import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import { pool } from "../config/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SAMPLE_PRODUCTS = [
  ["Midnight Oud", "Perfume", "50ml", 280, 160, 18, 5],
  ["Vanilla Bloom", "Perfume", "100ml", 195, 110, 24, 6],
  ["Rose Noir", "Perfume", "50ml", 240, 140, 12, 4],
  ["Citrus Veil", "Perfume", "30ml", 95, 50, 30, 8],
  ["Amber Dusk", "Perfume", "100ml", 320, 190, 9, 4],
  ["Ocean Breeze", "Air Freshener", "Car clip 8ml", 28, 12, 40, 10],
  ["Lavender Mist", "Air Freshener", "Room spray 200ml", 45, 20, 22, 6],
  ["Fresh Linen", "Air Freshener", "Reed diffuser 120ml", 75, 35, 14, 5],
  ["Tropical Bloom", "Air Freshener", "Gel 150g", 32, 14, 3, 5],
  ["Gift Box Wrap", "Other", "Standard", 15, 5, 50, 10],
];

export async function migrate() {
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await pool.query(schema);
  await pool.query(`
    ALTER TABLE sales ADD COLUMN IF NOT EXISTS signature TEXT;
    ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS product_type VARCHAR(50);
    ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS variant VARCHAR(120);
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

  const { rows } = await pool.query("SELECT COUNT(*)::int AS count FROM products");
  if (rows[0].count === 0) {
    for (const product of SAMPLE_PRODUCTS) {
      await pool.query(
        `INSERT INTO products
          (name, category, variant, selling_price, cost_price, stock_quantity, low_stock_threshold)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        product
      );
    }
  }
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
