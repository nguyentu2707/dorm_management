import test from "node:test";
import assert from "node:assert/strict";
import {
  isResidenceEligible,
  normalizeResidenceHistory,
} from "../dist/services/residence-history.rules.js";
test("eligibility depends on state, never approvedAt", () => {
  assert.equal(isResidenceEligible("ACTIVE", null), true);
  assert.equal(isResidenceEligible("ENDED", null), true);
  assert.equal(isResidenceEligible("PENDING", new Date()), false);
  assert.equal(isResidenceEligible("REJECTED", new Date()), false);
});
test("CANCELLED is residence only for the real ACTIVE-to-CANCELLED path", () => {
  assert.equal(isResidenceEligible("CANCELLED", null), false);
  assert.equal(isResidenceEligible("CANCELLED", new Date()), true);
});
test("timeline sorts by the displayed segmentStartDate descending", () => {
  const item = (id, date) => ({
    contractId: id,
    status: "ENDED",
    isCurrent: false,
    building: { id: "b", name: "B" },
    room: { id: "r", roomNumber: "1" },
    bed: { id: "x", bedNumber: "1" },
    segmentStartDate: new Date(date),
    plannedEndDate: new Date(),
    actualEndDate: new Date(),
    consistencyIssues: [],
  });
  const result = normalizeResidenceHistory([
    item("A", "2026-01-01"),
    item("C", "2026-03-01"),
    item("B", "2026-02-01"),
  ]);
  assert.deepEqual(
    result.map((x) => x.contractId),
    ["C", "B", "A"],
  );
});
test("multiple room changes remain separate and multiple ACTIVE data is flagged", () => {
  const items = ["2026-01-01", "2026-02-01", "2026-03-01"].map(
    (date, index) => ({
      contractId: String(index),
      status: index === 2 ? "ACTIVE" : "ENDED",
      isCurrent: index === 2,
      building: { id: "b", name: "B" },
      room: { id: `r${index}`, roomNumber: String(index) },
      bed: { id: "x", bedNumber: "1" },
      segmentStartDate: new Date(date),
      plannedEndDate: new Date(),
      actualEndDate: index === 2 ? null : new Date(),
      consistencyIssues: [],
    }),
  );
  assert.equal(normalizeResidenceHistory(items).length, 3);
  const duplicated = normalizeResidenceHistory([
    ...items,
    { ...items[2], contractId: "duplicate" },
  ]);
  assert.ok(
    duplicated
      .filter((x) => x.isCurrent)
      .every((x) => x.consistencyIssues.includes("MULTIPLE_ACTIVE_CONTRACTS")),
  );
});
