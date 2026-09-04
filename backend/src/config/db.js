import pg from "pg";

const { Pool } = pg;

export function getDatabaseUrl() {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    ""
  );
}

const connectionString = getDatabaseUrl();
const hosted =
  Boolean(process.env.VERCEL) ||
  /neon\.tech|supabase\.co|pooler\.supabase|vercel-storage|render\.com|amazonaws\.com/.test(
    connectionString
  );

export const pool = new Pool({
  connectionString: connectionString || undefined,
  ssl: hosted ? { rejectUnauthorized: false } : undefined,
});

const connect = pool.connect.bind(pool);
pool.connect = async function connectWithSearchPath() {
  const client = await connect();
  try {
    await client.query("SET search_path TO fragrance_universe");
  } catch {
    // Schema is created on first migrate.
  }
  return client;
};

export async function query(text, params) {
  const result = await pool.query(text, params);
  return result;
}

export async function withTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
