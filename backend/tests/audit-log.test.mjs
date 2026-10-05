import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeAuditData } from "../dist/services/audit-log.service.js";
test("audit sanitizer recursively removes authentication secrets", () => {
  const cleaned = sanitizeAuditData({
    status: "ACTIVE",
    password: "x",
    profile: {
      passwordHash: "x",
      accessToken: "x",
      refreshTokenHash: "x",
      safe: "yes",
    },
    items: [{ refreshToken: "x", amount: 1 }],
    authorization: "Bearer x",
    cookie: "x",
  });
  assert.deepEqual(cleaned, {
    status: "ACTIVE",
    profile: { safe: "yes" },
    items: [{ amount: 1 }],
  });
});
