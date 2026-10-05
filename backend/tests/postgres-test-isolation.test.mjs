import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { requireTestDatabase } from "../scripts/testing/test-database-url.mjs";
const cwd = fileURLToPath(new URL("../", import.meta.url));
test("test bootstrap selects TEST_DATABASE_URL without rewriting DATABASE_URL", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      `const { pool } = await import(${JSON.stringify(new URL("../dist/database/pool.js", import.meta.url).href)});
       if (pool.options.connectionString !== process.env.TEST_DATABASE_URL) process.exitCode = 2;
       if (process.env.DATABASE_URL !== "postgresql://test@127.0.0.1:1/wrong_test") process.exitCode = 3;
       await pool.end();`,
    ],
    {
      cwd,
      encoding: "utf8",
      timeout: 10000,
      env: {
        ...process.env,
        DATABASE_URL: "postgresql://test@127.0.0.1:1/wrong_test",
        TEST_DATABASE_URL: "postgresql://test@127.0.0.1:1/selected_test",
        DATABASE_URL_SOURCE: "TEST_DATABASE_URL",
      },
    },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stderr, /ECONNREFUSED/);
});
test("runner refuses a non-test database before starting the destructive suite", () => {
  assert.throws(
    () =>
      requireTestDatabase(
        "postgresql://user:do-not-print-secret@invalid host/database",
      ),
    (e) =>
      !e.message.includes("do-not-print-secret") &&
      e.message.includes("dedicated database"),
  );
  assert.throws(
    () =>
      requireTestDatabase(
        "postgresql://test@127.0.0.1/same_test",
        "postgresql://test@127.0.0.1/same_test",
      ),
    /dedicated database/,
  );
  const result = spawnSync(
    process.execPath,
    ["scripts/testing/run-postgres-tests.mjs"],
    {
      cwd,
      encoding: "utf8",
      timeout: 10000,
      env: {
        ...process.env,
        TEST_DATABASE_URL: "postgresql://test@127.0.0.1:1/development",
      },
    },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /dedicated database ending in _test/);
});
