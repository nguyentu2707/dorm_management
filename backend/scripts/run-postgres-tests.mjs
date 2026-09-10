import "dotenv/config";
import { spawnSync } from "node:child_process";
import { requireTestDatabase } from "./test-database-url.mjs";
const value = process.env.TEST_DATABASE_URL;
let valid = false;
try {
  requireTestDatabase(value, process.env.DATABASE_URL);
  valid = true;
} catch {
  valid = false;
}
if (!valid) {
  console.error(
    "Set TEST_DATABASE_URL to a dedicated database ending in _test",
  );
  process.exitCode = 1;
} else {
  // Set the database BEFORE Node evaluates any static import in the test process.
  const result = spawnSync(
    process.execPath,
    ["--test", "tests/postgres.integration.mjs"],
    {
      env: { ...process.env, DATABASE_URL: value },
      stdio: "inherit",
    },
  );
  process.exitCode = result.status ?? 1;
}
