import test from "node:test";
import assert from "node:assert/strict";
import { RoomRecommendationService, scheduleSimilarity } from "../src/services/room-recommendation.service.js";
import type { ScheduleEntry } from "../src/models/class-schedule.model.js";

const morning: ScheduleEntry[] = [{ dayOfWeek: "MONDAY", startPeriod: 1, endPeriod: 4 }];
const afternoon: ScheduleEntry[] = [{ dayOfWeek: "MONDAY", startPeriod: 6, endPeriod: 9 }];
const candidate = (id: string, price: number, hot: boolean, occupied: number, schedules: ScheduleEntry[][]) => ({
  room: { id, roomNumber: id, building: { id: "building", name: "Tòa test" }, pricePerMonth: price, capacity: 4 },
  availableBedCount: 4 - occupied, occupiedBedCount: occupied, hasHotWater: hot, residentSchedules: schedules,
});
function service(preference: unknown, schedule: unknown, candidates: unknown[]) {
  return new RoomRecommendationService(
    { findByUserId: async () => ({ id: "student" }) } as never,
    { findPendingOrActiveByStudentId: async () => null } as never,
    { findByStudentId: async () => preference } as never,
    { findByStudentId: async () => schedule } as never,
    { findCandidates: async () => candidates } as never,
  );
}

test("cosine schedule similarity rewards comparable schedules", () => {
  assert.equal(scheduleSimilarity(morning, morning), 1);
  assert.equal(scheduleSimilarity(morning, afternoon), 0);
});
test("no preference and no schedule still returns BASIC rooms", async () => {
  const result = await service(null, null, [candidate("A", 1_200_000, false, 1, [])]).recommend("user", 5);
  assert.equal(result.items[0]?.personalizationLevel, "BASIC");
});
test("LOW and hot-water preferences improve otherwise comparable candidates", async () => {
  const result = await service({ pricePreference: "LOW", wantsHotWater: true }, null, [
    candidate("expensive", 1_500_000, false, 1, []), candidate("preferred", 1_200_000, true, 1, []),
  ]).recommend("user", 5);
  assert.equal(result.items[0]?.room.id, "preferred");
});
test("personalization is BASIC/PARTIAL/PERSONALIZED per room and similar schedules rank higher", async () => {
  const result = await service(null, { entries: morning }, [
    candidate("basic", 1_200_000, false, 1, []),
    candidate("partial", 1_200_000, false, 3, [morning]),
    candidate("dissimilar", 1_200_000, false, 3, [afternoon, afternoon]),
    candidate("similar", 1_200_000, false, 3, [morning, morning]),
  ]).recommend("user", 10);
  const levels = new Map(result.items.map((item) => [item.room.id, item.personalizationLevel]));
  assert.equal(levels.get("basic"), "BASIC");
  assert.equal(levels.get("partial"), "PARTIAL");
  assert.equal(levels.get("similar"), "PERSONALIZED");
  assert.ok(result.items.findIndex((item) => item.room.id === "similar") < result.items.findIndex((item) => item.room.id === "dissimilar"));
});
