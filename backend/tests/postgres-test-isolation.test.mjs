import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { requireTestDatabase } from "../scripts/test-database-url.mjs";
const cwd = fileURLToPath(new URL("../", import.meta.url));
test("test bootstrap refuses a Pool imported before the test database is selected", () => {
  // Reproduce the early-import regression with deliberately unreachable, credential-free
  // URLs. The Pool identity guard must fail BEFORE any connection, migration or reset.
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      new URL("../dist/database/pool.js", import.meta.url).href,
      "tests/postgres.integration.mjs",
    ],
    {
      cwd,
      encoding: "utf8",
      timeout: 10000,
      env: {
        ...process.env,
        DATABASE_URL: "postgresql://test@127.0.0.1:1/wrong_test",
        TEST_DATABASE_URL: "postgresql://test@127.0.0.1:1/selected_test",
      },
    },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Pool must target TEST_DATABASE_URL/);
  assert.doesNotMatch(result.stderr, /ECONNREFUSED/);
});
test("runner refuses a non-test database before starting the destructive suite", () => {
  assert.throws(()=>requireTestDatabase('postgresql://user:do-not-print-secret@invalid host/database'), e=> !e.message.includes('do-not-print-secret') && e.message.includes('dedicated database'));
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
    ["scripts/run-postgres-tests.mjs"],
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
