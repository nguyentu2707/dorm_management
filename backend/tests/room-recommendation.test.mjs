import test from "node:test";
import assert from "node:assert/strict";
import { RoomRecommendationService, scheduleSimilarity } from "../dist/services/room-recommendation.service.js";
const morning = [{ dayOfWeek: "MONDAY", startPeriod: 1, endPeriod: 4 }];
const afternoon = [{ dayOfWeek: "MONDAY", startPeriod: 6, endPeriod: 9 }];
const candidate = (id, price, hot, occupied, schedules) => ({ room: { id, roomNumber: id, building: { id: "building", name: "Tòa test" }, pricePerMonth: price, capacity: 4 }, availableBedCount: 4 - occupied, occupiedBedCount: occupied, hasHotWater: hot, residentSchedules: schedules });
const service = (preference, schedule, candidates) => new RoomRecommendationService(
  { findByUserId: async () => ({ id: "student" }) }, { findPendingOrActiveByStudentId: async () => null },
  { findByStudentId: async () => preference }, { findByStudentId: async () => schedule }, { findCandidates: async () => candidates },
);
test("schedule similarity", () => { assert.equal(scheduleSimilarity(morning, morning), 1); assert.equal(scheduleSimilarity(morning, afternoon), 0); });
test("missing optional data returns BASIC", async () => { const result = await service(null, null, [candidate("A", 1_200_000, false, 1, [])]).recommend("user", 5); assert.equal(result.items[0].personalizationLevel, "BASIC"); });
test("LOW and hot-water preferences affect ranking", async () => { const result = await service({ pricePreference: "LOW", wantsHotWater: true }, null, [candidate("expensive", 1_500_000, false, 1, []), candidate("preferred", 1_200_000, true, 1, [])]).recommend("user", 5); assert.equal(result.items[0].room.id, "preferred"); });
test("levels are per room and similar schedules rank higher", async () => {
  const result = await service(null, { entries: morning }, [candidate("basic", 1_200_000, false, 1, []), candidate("partial", 1_200_000, false, 3, [morning]), candidate("dissimilar", 1_200_000, false, 3, [afternoon, afternoon]), candidate("similar", 1_200_000, false, 3, [morning, morning])]).recommend("user", 10);
  const levels = new Map(result.items.map((item) => [item.room.id, item.personalizationLevel]));
  assert.equal(levels.get("basic"), "BASIC"); assert.equal(levels.get("partial"), "PARTIAL"); assert.equal(levels.get("similar"), "PERSONALIZED");
  assert.ok(result.items.findIndex((item) => item.room.id === "similar") < result.items.findIndex((item) => item.room.id === "dissimilar"));
});
