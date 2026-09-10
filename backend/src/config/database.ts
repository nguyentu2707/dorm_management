import "dotenv/config";
import { pool } from "../database/pool.js";
export async function connectDatabase(): Promise<void> {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  await pool.query("SELECT 1");
}
export async function disconnectDatabase(): Promise<void> {
  await pool.end();
}
