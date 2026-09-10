import test from "node:test";
import assert from "node:assert/strict";
import {
  allocateExact,
  billingMonthInfo,
  getResidenceOverlapDays,
  prorateRoomFee,
} from "../dist/services/monthly-billing.rules.js";
import { MonthlyBillingCalculator } from "../dist/services/monthly-billing.calculator.js";
import { BILLING_FEE_CONFIG } from "../dist/config/billing-fees.js";

const active = (startDate, endDate) => ({
  status: "ACTIVE",
  startDate: new Date(startDate),
  endDate: new Date(endDate),
  endedAt: null,
});

test("real calendar month lengths include leap years", () => {
  assert.equal(billingMonthInfo("2026-01").daysInMonth, 31);
  assert.equal(billingMonthInfo("2026-02").daysInMonth, 28);
  assert.equal(billingMonthInfo("2024-02").daysInMonth, 29);
  assert.equal(billingMonthInfo("2026-04").daysInMonth, 30);
});

test("overlap days use Vietnam calendar boundaries without off-by-one", () => {
  assert.equal(
    getResidenceOverlapDays(
      active("2026-01-31T17:00:00Z", "2026-02-27T17:00:00Z"),
      "2026-02",
    ),
    28,
  );
  assert.equal(
    getResidenceOverlapDays(
      {
        ...active("2026-09-01T00:00:00+07:00", "2026-09-30T23:00:00+07:00"),
        status: "ENDED",
        endedAt: new Date("2026-09-15T10:00:00+07:00"),
      },
      "2026-09",
    ),
    15,
  );
  assert.equal(
    getResidenceOverlapDays(
      active("2026-08-01T00:00:00+07:00", "2026-08-31T23:00:00+07:00"),
      "2026-09",
    ),
    0,
  );
});

test("room-change contract segments are prorated independently", () => {
  const oldRoom = {
    status: "ENDED",
    startDate: new Date("2026-09-01T00:00:00+07:00"),
    endDate: new Date("2026-12-31T00:00:00+07:00"),
    endedAt: new Date("2026-09-15T18:00:00+07:00"),
  };
  const newRoom = active(
    "2026-09-16T00:00:00+07:00",
    "2026-12-31T00:00:00+07:00",
  );
  assert.equal(getResidenceOverlapDays(oldRoom, "2026-09"), 15);
  assert.equal(getResidenceOverlapDays(newRoom, "2026-09"), 15);
  assert.equal(prorateRoomFee(1_800_000, 15, 30), 900_000);
});

test("a same-day room change assigns the transition day only to the new segment", () => {
  const transition = new Date("2026-09-15T12:00:00+07:00");
  const oldRoom = {
    status: "ENDED",
    startDate: new Date("2026-09-01T00:00:00+07:00"),
    endDate: new Date("2026-12-31T00:00:00+07:00"),
    endedAt: transition,
    nextSegmentStartDate: transition,
  };
  const newRoom = active(
    "2026-09-15T12:00:00+07:00",
    "2026-09-30T23:00:00+07:00",
  );
  assert.equal(getResidenceOverlapDays(oldRoom, "2026-09"), 14);
  assert.equal(getResidenceOverlapDays(newRoom, "2026-09"), 16);
});

test("largest remainder allocation preserves exact totals deterministically", () => {
  const result = allocateExact(100, [
    { key: "a", weight: 1 },
    { key: "b", weight: 1 },
    { key: "c", weight: 1 },
  ]);
  assert.deepEqual(
    [...result.entries()],
    [
      ["a", 34],
      ["b", 33],
      ["c", 33],
    ],
  );
  assert.equal(
    [...result.values()].reduce((sum, value) => sum + value, 0),
    100,
  );
});

test("calculator derives utility and exact resident-day allocations", async () => {
  const roomId = "507f1f77bcf86cd799439011";
  const residents = [30, 30, 15, 15].map((days, index) => ({
    contractId: `contract-${index}`,
    studentId: `student-${index}`,
    mssv: `SV${index}`,
    fullName: `Student ${index}`,
    status: "ACTIVE",
    startDate: new Date(`2026-09-${days === 30 ? "01" : "16"}T00:00:00+07:00`),
    endDate: new Date("2026-09-30T23:00:00+07:00"),
    endedAt: null,
    roomMonthlyPrice: 1_800_000,
  }));
  const calculator = new MonthlyBillingCalculator(
    {
      findById: async () => ({
        id: roomId,
        roomNumber: "101",
        buildingId: { toString: () => "building" },
      }),
    },
    { findById: async () => ({ id: "building", name: "Tòa A" }) },
    { findBillingResidenceSegments: async () => residents },
    {
      findByRoomAndPeriod: async () => null,
      findLatestByRoom: async () => ({
        billingPeriod: "2026-08",
        electricityCurrent: 150,
        waterCurrent: 30,
      }),
    },
    BILLING_FEE_CONFIG,
  );
  const preview = await calculator.calculate({
    roomId: { toString: () => roomId },
    billingPeriod: "2026-09",
    draftElectricityPrevious: 150,
    draftElectricityCurrent: 230,
    draftWaterPrevious: 30,
    draftWaterCurrent: 42,
  });
  assert.equal(preview.electricity.usage, 80);
  assert.equal(preview.electricity.amount, 280_000);
  assert.equal(preview.water.usage, 12);
  assert.equal(preview.water.amount, 180_000);
  assert.equal(preview.totalResidentDays, 90);
  for (const key of [
    "electricityShare",
    "waterShare",
    "wifiShare",
    "trashShare",
  ]) {
    const expected = {
      electricityShare: preview.electricity.amount,
      waterShare: preview.water.amount,
      wifiShare: preview.wifiFee,
      trashShare: preview.trashFee,
    }[key];
    assert.equal(
      preview.residents.reduce((sum, resident) => sum + resident[key], 0),
      expected,
    );
  }
});

test("calculator refuses financial allocation with zero resident-days", async () => {
  const roomId = "507f1f77bcf86cd799439011";
  const calculator = new MonthlyBillingCalculator(
    {
      findById: async () => ({
        id: roomId,
        roomNumber: "101",
        buildingId: { toString: () => "building" },
      }),
    },
    { findById: async () => ({ id: "building", name: "Tòa A" }) },
    { findBillingResidenceSegments: async () => [] },
    {
      findByRoomAndPeriod: async () => null,
      findLatestByRoom: async () => null,
    },
    BILLING_FEE_CONFIG,
  );
  await assert.rejects(
    () =>
      calculator.calculate({
        roomId: { toString: () => roomId },
        billingPeriod: "2026-09",
        draftElectricityPrevious: 0,
        draftElectricityCurrent: 0,
        draftWaterPrevious: 0,
        draftWaterCurrent: 0,
      }),
    (error) => error.code === "MONTHLY_BILLING_NO_RESIDENTS",
  );
});
