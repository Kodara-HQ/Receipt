import "dotenv/config";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  options: "-c search_path=fragrance_universe",
});

const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("DELETE FROM sale_items");
  const sales = await client.query("DELETE FROM sales RETURNING receipt_number");
  await client.query("UPDATE receipt_counter SET last_number = 0, last_date = '' WHERE id = 1");
  await client.query("COMMIT");
  console.log(`Cleared ${sales.rowCount} receipt(s). Next number will be YYYYMMDD0001.`);
} catch (error) {
  await client.query("ROLLBACK");
  console.error(error.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
