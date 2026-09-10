import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { AppError } from "../dist/errors/AppError.js";
import {
  translatePostgresError,
  constraintErrors,
} from "../dist/database/postgres-errors.js";
import { errorHandler } from "../dist/middlewares/error-handler.js";
import { numeric } from "../dist/database/query.js";
import { pool } from "../dist/database/pool.js";
import { PostgresTransactionManager } from "../dist/services/transaction-manager.js";

test("SQLSTATE and exact constraint identify unique business errors", () => {
  assert.equal(
    translatePostgresError({ code: "23001", constraint: "fk_payments_invoice" })
      .code,
    "REFERENCE_CONFLICT",
  );
  for (const [constraint, definition] of Object.entries(
    constraintErrors["23505"],
  )) {
    const translated = translatePostgresError({
      code: "23505",
      constraint,
      message: "任意の翻訳",
      detail: "secret@example.com",
    });
    assert.equal(translated.statusCode, definition[0]);
    assert.equal(translated.code, definition[1]);
  }
  assert.equal(
    translatePostgresError({ code: "23505", constraint: "uq_users_email" })
      .code,
    "EMAIL_ALREADY_EXISTS",
  );
  assert.equal(
    translatePostgresError({
      code: "23505",
      constraint: "uq_rooms_building_room_number",
    }).code,
    "ROOM_NUMBER_ALREADY_EXISTS",
  );
  assert.equal(
    translatePostgresError({ code: "23503", constraint: "uq_users_email" })
      .code,
    "REFERENCE_CONFLICT",
  );
  for (const constraint of [
    "uq_users_email_suffix",
    "__proto__",
    "constructor",
    "toString",
    "",
  ])
    assert.equal(
      translatePostgresError({ code: "23505", constraint }).code,
      "VALIDATION_ERROR",
    );
});
test("every mapped constraint is defined verbatim in migrations", async () => {
  const sql = (
    await Promise.all(
      [
        "001_initial",
        "002_query_indexes",
        "003_payments",
        "004_building_operations",
        "005_refresh_sessions_student_registry",
      ].map((f) =>
        readFile(new URL(`../migrations/${f}.up.sql`, import.meta.url), "utf8"),
      ),
    )
  ).join("\n");
  for (const entries of Object.values(constraintErrors))
    for (const name of Object.keys(entries))
      assert.match(sql, new RegExp(`(?:CONSTRAINT|INDEX) ${name}\\b`), name);
});
test("unknown errors and existing AppErrors remain correctly classified", () => {
  for (const input of [
    null,
    undefined,
    1,
    "23505",
    {},
    { code: 23505 },
    { code: "42601", constraint: "uq_users_email" },
  ])
    assert.equal(translatePostgresError(input), undefined);
  const existing = new AppError(403, "FORBIDDEN", "Denied");
  assert.equal(translatePostgresError(existing), existing);
  for (const code of ["40001", "40P01", "55P03"])
    assert.equal(
      translatePostgresError({ code }).code,
      "CONCURRENT_MODIFICATION",
    );
  assert.equal(
    translatePostgresError({
      code: "23514",
      constraint: "ck_contracts_date_range",
    }).code,
    "INVALID_DATE_RANGE",
  );
  assert.equal(
    translatePostgresError({
      code: "23503",
      constraint: "fk_contracts_bed_room",
    }).code,
    "CONTRACT_ROOM_MISMATCH",
  );
});
test("HTTP error envelope never exposes SQL, diagnostics, input or stack", () => {
  for (const code of ["23505", "23503", "23514", "42601", "40001"]) {
    let status, body;
    const res = {
      status(x) {
        status = x;
        return this;
      },
      json(x) {
        body = x;
        return this;
      },
    };
    errorHandler(
      {
        code,
        constraint: "uq_users_email",
        message: "SELECT secret",
        detail: "secret@example.com",
        stack: "private",
      },
      {},
      res,
      () => {},
    );
    assert.deepEqual(Object.keys(body).sort(), ["code", "message", "success"]);
    assert.equal(body.success, false);
    assert.ok(!JSON.stringify(body).includes("secret"));
    assert.ok(!JSON.stringify(body).includes("uq_users_email"));
    assert.equal(status, code === "42601" ? 500 : code === "23514" ? 400 : 409);
  }
});
test("numeric boundary rejects unsafe integer conversion", () => {
  assert.equal(numeric("9007199254740991"), Number.MAX_SAFE_INTEGER);
  assert.equal(numeric("123.125"), 123.125);
  for (const x of ["9007199254740992", "NaN", "Infinity", "-9007199254740992"])
    assert.throws(() => numeric(x));
});
test("rollback failure does not mask the original error and discards the client", async () => {
  const connect = pool.connect;
  const calls = [];
  const original = new Error("business failure");
  pool.connect = async () => ({
    query: async (sql) => {
      calls.push(sql);
      if (sql === "ROLLBACK") throw new Error("connection lost");
    },
    release: (discard) => calls.push(discard),
  });
  try {
    await assert.rejects(
      () =>
        new PostgresTransactionManager().runInTransaction(async () => {
          throw original;
        }),
      (e) => e === original,
    );
    assert.deepEqual(calls, ["BEGIN", "ROLLBACK", true]);
  } finally {
    pool.connect = connect;
  }
});
