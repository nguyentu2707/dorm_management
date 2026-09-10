import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import pg from "pg";

export async function migrate(pool, direction = "up") {
  if (!["up", "down"].includes(direction))
    throw new Error("Expected up or down");
  const directory = new URL("../migrations/", import.meta.url);
  const files = (await readdir(directory))
    .filter((x) => /^\d+_.+\.up\.sql$/.test(x))
    .sort();
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock(782194013)");
    await client.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (version text CONSTRAINT pk_schema_migrations PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`,
    );
    const applied = (
      await client.query(
        "SELECT version,checksum FROM schema_migrations ORDER BY version",
      )
    ).rows;
    for (const row of applied) {
      const content = await readFile(
        new URL(row.version + ".up.sql", directory),
        "utf8",
      );
      if (createHash("sha256").update(content).digest("hex") !== row.checksum)
        throw new Error("Applied migration checksum mismatch: " + row.version);
    }
    if (direction === "down") {
      const last = applied.at(-1);
      if (!last) return;
      await client.query("BEGIN");
      await client.query(
        await readFile(new URL(last.version + ".down.sql", directory), "utf8"),
      );
      await client.query("DELETE FROM schema_migrations WHERE version=$1", [
        last.version,
      ]);
      await client.query("COMMIT");
    } else
      for (const file of files) {
        const version = file.replace(".up.sql", "");
        if (applied.some((x) => x.version === version)) continue;
        const content = await readFile(new URL(file, directory), "utf8");
        await client.query("BEGIN");
        await client.query(content);
        await client.query(
          "INSERT INTO schema_migrations(version,checksum) VALUES ($1,$2)",
          [version, createHash("sha256").update(content).digest("hex")],
        );
        await client.query("COMMIT");
      }
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    await client.query("SELECT pg_advisory_unlock(782194013)").catch(() => {});
    client.release();
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await migrate(pool, process.argv[2] ?? "up");
    console.log("Migrations complete");
  } catch (error) {
    console.error("Migration failed", {
      code: error.code ?? "MIGRATION_ERROR",
    });
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
