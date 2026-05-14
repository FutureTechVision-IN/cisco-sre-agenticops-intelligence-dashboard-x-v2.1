import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;

const databaseUrl = process.env.DATABASE_URL;

// Allow CSV fallback mode without database
let pool: InstanceType<typeof Pool> | null = null;
let db: ReturnType<typeof drizzle> | null = null;

if (databaseUrl) {
  pool = new Pool({
    connectionString: databaseUrl,
  });
  db = drizzle(pool);
} else if (!process.env.USE_CSV_FALLBACK) {
  console.warn("DATABASE_URL is not set. Use USE_CSV_FALLBACK=true for CSV-only mode.");
}

export { db };

// For raw queries, support both neon-style and pg-style calls
export const rawQuery = async (sql: string, params?: any[]) => {
  if (!pool) {
    throw new Error("Database not configured. Use CSV fallback mode.");
  }
  const result = await pool.query(sql, params);
  return result.rows;
};
