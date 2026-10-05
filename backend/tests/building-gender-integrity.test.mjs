import test from "node:test";
import assert from "node:assert/strict";
import { BuildingService } from "../dist/services/admin/building.service.js";

const building = (overrides = {}) => ({
  id: "building-1",
  name: "Tòa A",
  address: "Old address",
  description: "Old description",
  status: "ACTIVE",
  allowedGender: "MALE",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
  ...overrides,
});

function fixture({
  incompatible = false,
  auditFails = false,
  initialGender = "MALE",
} = {}) {
  let stored = building({ allowedGender: initialGender });
  const calls = [];
  const auditRows = [];
  const repo = {
    findByIdForUpdate: async (id, tx) => {
      calls.push(["lock", id, tx]);
      return stored;
    },
    hasIncompatibleActiveResidents: async (id, gender, tx) => {
      calls.push(["check", id, gender, tx]);
      return incompatible;
    },
    update: async (id, data, tx) => {
      calls.push(["update", id, data, tx]);
      stored = { ...stored, ...data, updatedAt: new Date() };
      return stored;
    },
  };
  const tx = {
    runInTransaction: async (work) => {
      const snapshot = stored;
      const auditSnapshot = auditRows.length;
      try {
        return await work({ transactionId: "tx-1" });
      } catch (error) {
        stored = snapshot;
        auditRows.length = auditSnapshot;
        throw error;
      }
    },
  };
  const audit = {
    record: async (data, context, transaction) => {
      auditRows.push({ data, context, transaction });
      if (auditFails) throw new Error("audit failed");
    },
  };
  return {
    service: new BuildingService(repo, {}, tx, audit),
    calls,
    auditRows,
    current: () => stored,
  };
}

test("same gender update locks the building but skips the resident query", async () => {
  const f = fixture();
  const result = await f.service.update("building-1", {
    name: "Tòa A mới",
    allowedGender: "MALE",
  });
  assert.equal(result.name, "Tòa A mới");
  assert.deepEqual(f.calls.map(([name]) => name), ["lock", "update"]);
});

for (const initialGender of ["MALE", "FEMALE"]) {
  test(`${initialGender} to MIXED is a fast path without the resident query`, async () => {
    const f = fixture({ incompatible: true, initialGender });
    const result = await f.service.update("building-1", {
      allowedGender: "MIXED",
    });
    assert.equal(result.allowedGender, "MIXED");
    assert.deepEqual(f.calls.map(([name]) => name), ["lock", "update"]);
  });
}

for (const allowedGender of ["MALE", "FEMALE"]) {
  test(`changing to ${allowedGender} succeeds when ACTIVE residents are compatible`, async () => {
    const f = fixture({
      initialGender: allowedGender === "MALE" ? "FEMALE" : "MALE",
    });
    const result = await f.service.update("building-1", {
      allowedGender,
      description: "Updated atomically",
    });
    assert.equal(result.allowedGender, allowedGender);
    assert.equal(result.description, "Updated atomically");
    assert.deepEqual(f.calls.map(([name]) => name), [
      "lock",
      "check",
      "update",
    ]);
  });
}

for (const [initialGender, targetGender] of [
  ["MALE", "FEMALE"],
  ["FEMALE", "MALE"],
]) {
  test(`${initialGender} to ${targetGender} rejects incompatible ACTIVE residents and every other field`, async () => {
    const f = fixture({ incompatible: true, initialGender });
    await assert.rejects(
      () =>
        f.service.update(
          "building-1",
          {
            name: "Must roll back",
            status: "MAINTENANCE",
            allowedGender: targetGender,
          },
          { actorUserId: "admin-1" },
        ),
      (error) =>
        error.statusCode === 409 &&
        error.code === "BUILDING_GENDER_CONFLICT_WITH_RESIDENTS",
    );
    assert.deepEqual(f.calls.map(([name]) => name), ["lock", "check"]);
    assert.equal(f.current().name, "Tòa A");
    assert.equal(f.current().status, "ACTIVE");
    assert.equal(f.current().allowedGender, initialGender);
    assert.equal(f.auditRows.length, 0);
  });
}

test("a restricted gender change succeeds when there are no ACTIVE residents", async () => {
  const f = fixture({ initialGender: "MIXED" });
  const result = await f.service.update("building-1", {
    allowedGender: "MALE",
  });
  assert.equal(result.allowedGender, "MALE");
  assert.deepEqual(f.calls.map(([name]) => name), ["lock", "check", "update"]);
});

test("multi-field update and AuditLog roll back together", async () => {
  const f = fixture({ auditFails: true });
  await assert.rejects(
    () =>
      f.service.update(
        "building-1",
        { name: "New name", status: "MAINTENANCE" },
        { actorUserId: "admin-1" },
      ),
    /audit failed/,
  );
  assert.equal(f.current().name, "Tòa A");
  assert.equal(f.current().status, "ACTIVE");
  assert.equal(f.auditRows.length, 0);
});

test("successful gender change writes AuditLog in the same transaction", async () => {
  const f = fixture();
  await f.service.update(
    "building-1",
    { allowedGender: "FEMALE" },
    { actorUserId: "admin-1" },
  );
  assert.equal(f.auditRows.length, 1);
  assert.equal(f.auditRows[0].data.action, "BUILDING_GENDER_CHANGED");
  assert.equal(f.auditRows[0].transaction.transactionId, "tx-1");
});
