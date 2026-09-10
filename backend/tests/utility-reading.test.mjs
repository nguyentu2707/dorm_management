import test from "node:test";
import assert from "node:assert/strict";
import {
  BILLING_PERIOD_PATTERN,
  calculateReading,
  currentBillingPeriod,
  getMeterEditRestriction,
  getUnitPriceEditRestriction,
} from "../dist/services/utility-reading.rules.js";
import { UtilityReadingService } from "../dist/services/utility-reading.service.js";

const roomId = "507f1f77bcf86cd799439011";
const adminId = "507f1f77bcf86cd799439012";

function document(
  period,
  electricityPrevious,
  electricityCurrent,
  waterPrevious,
  waterCurrent,
  id = period,
) {
  return {
    id,
    id: { toString: () => id },
    roomId: { toString: () => roomId },
    billingPeriod: period,
    electricityPrevious,
    electricityCurrent,
    electricityUsage: electricityCurrent - electricityPrevious,
    electricityUnitPrice: 3000,
    electricityAmount: (electricityCurrent - electricityPrevious) * 3000,
    waterPrevious,
    waterCurrent,
    waterUsage: waterCurrent - waterPrevious,
    waterUnitPrice: 15000,
    waterAmount: (waterCurrent - waterPrevious) * 15000,
  };
}

function input(period, overrides = {}) {
  return {
    roomId,
    billingPeriod: period,
    electricityPrevious: 100,
    electricityCurrent: 120,
    electricityUnitPrice: 3000,
    waterPrevious: 10,
    waterCurrent: 13,
    waterUnitPrice: 15000,
    ...overrides,
  };
}

function harness(initial = []) {
  const values = [...initial];
  let tail = Promise.resolve();
  const readings = {
    findById: async (id) => values.find((item) => item.id === id) ?? null,
    findByRoomAndPeriod: async (_roomId, period) =>
      values.find((item) => item.billingPeriod === period) ?? null,
    findLatestByRoom: async () =>
      [...values].sort((a, b) =>
        b.billingPeriod.localeCompare(a.billingPeriod),
      )[0] ?? null,
    findPreviousBeforePeriod: async (_roomId, period) =>
      [...values]
        .filter((item) => item.billingPeriod < period)
        .sort((a, b) => b.billingPeriod.localeCompare(a.billingPeriod))[0] ??
      null,
    findByRoom: async () =>
      [...values].sort((a, b) =>
        b.billingPeriod.localeCompare(a.billingPeriod),
      ),
    findAll: async () => ({
      items: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    }),
    create: async (data) => {
      const item = document(
        data.billingPeriod,
        data.electricityPrevious,
        data.electricityCurrent,
        data.waterPrevious,
        data.waterCurrent,
        `id-${data.billingPeriod}`,
      );
      Object.assign(item, data);
      values.push(item);
      return item;
    },
    update: async (id, data) => {
      const item = values.find((entry) => entry.id === id);
      if (!item) return null;
      Object.assign(item, data);
      return item;
    },
  };
  const tx = {
    runInTransaction: async (work) => {
      const previous = tail;
      let release;
      tail = new Promise((resolve) => {
        release = resolve;
      });
      await previous;
      try {
        return await work({});
      } finally {
        release();
      }
    },
  };
  const service = new UtilityReadingService(
    readings,
    {
      findById: async () => ({
        id: roomId,
        roomNumber: "101",
        buildingId: { toString: () => "building-1" },
      }),
      lockUtilityLedger: async () => {},
    },
    { findById: async () => ({ id: "building-1", name: "A" }) },
    { findActiveByStudentId: async () => null },
    { findByUserId: async () => null },
    tx,
  );
  return { service, values };
}

async function expectCode(promise, code) {
  await assert.rejects(promise, (error) => error?.code === code);
}

test("billing period is canonical and current month uses Ho Chi Minh timezone", () => {
  assert.equal(BILLING_PERIOD_PATTERN.test("2026-09"), true);
  assert.equal(BILLING_PERIOD_PATTERN.test("2026-9"), false);
  assert.equal(BILLING_PERIOD_PATTERN.test("2026-13"), false);
  assert.equal(BILLING_PERIOD_PATTERN.test("2026-00"), false);
  assert.equal(BILLING_PERIOD_PATTERN.test("abc"), false);
  assert.equal(
    currentBillingPeriod(new Date("2025-12-31T17:30:00Z")),
    "2026-01",
  );
  assert.ok("2026-02" > "2026-01");
  assert.ok("2025-12" < "2026-01");
});

test("edit policy exposes semantic extension points", () => {
  assert.equal(
    getMeterEditRestriction({ hasNextPeriod: true }),
    "HAS_NEXT_PERIOD",
  );
  assert.equal(
    getMeterEditRestriction({ hasNextPeriod: false, usedByInvoice: true }),
    "USED_BY_INVOICE",
  );
  assert.equal(getMeterEditRestriction({ hasNextPeriod: false }), null);
  assert.equal(
    getUnitPriceEditRestriction({ usedByInvoice: true }),
    "USED_BY_INVOICE",
  );
  assert.equal(getUnitPriceEditRestriction({}), null);
});

test("usage and amount are calculated on the server", () => {
  assert.deepEqual(calculateReading(100, 125, 3000), {
    previous: 100,
    current: 125,
    usage: 25,
    unitPrice: 3000,
    amount: 75000,
  });
  assert.throws(() => calculateReading(100, 99, 3000));
});

test("official readings can only be written through MonthlyBilling FINALIZE", async () => {
  const f = harness();
  await assert.rejects(
    () => f.service.create("admin", input()),
    (e) => e.code === "UTILITY_READING_MANAGED_BY_BILLING",
  );
  await assert.rejects(
    () => f.service.update("reading", {}),
    (e) => e.code === "UTILITY_READING_MANAGED_BY_BILLING",
  );
});
