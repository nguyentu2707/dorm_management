import "dotenv/config";
import pg from "pg";
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
});
try {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
  const result = await pool.query(
    "SELECT version() AS version,current_database() AS database",
  );
  console.log("PostgreSQL connected");
  console.log(result.rows[0]);
} catch (e) {
  console.error("PostgreSQL connection failed:", e.code ?? e.name);
  process.exitCode = 1;
} finally {
  await pool.end();
}
