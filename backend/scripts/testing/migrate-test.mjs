import "dotenv/config";
import pg from "pg";
import { migrate } from "../database/migrate.mjs";
import { requireTestDatabase } from "./test-database-url.mjs";

const connectionString = process.env.TEST_DATABASE_URL;
requireTestDatabase(connectionString, process.env.DATABASE_URL);
const pool = new pg.Pool({ connectionString });
try {
  await migrate(pool, "up");
  console.log("Test database migrations complete");
} catch (error) {
  console.error("Test migration failed", {
    code: error.code ?? "MIGRATION_ERROR",
  });
  process.exitCode = 1;
} finally {
  await pool.end();
}
