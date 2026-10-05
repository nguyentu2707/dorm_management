import "dotenv/config";
import pg from "pg";

const databaseSource = process.env.DATABASE_URL_SOURCE ?? "DATABASE_URL";
if (!["DATABASE_URL", "TEST_DATABASE_URL"].includes(databaseSource))
  throw new Error(
    "DATABASE_URL_SOURCE must be DATABASE_URL or TEST_DATABASE_URL",
  );
const connectionString = process.env[databaseSource];
if (!connectionString) throw new Error(`${databaseSource} is required`);

export const pool = new pg.Pool({
  connectionString,
  max: 10,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
});
pool.on("error", () => console.error("PostgreSQL idle connection failed"));
