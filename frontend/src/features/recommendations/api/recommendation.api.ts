import { apiClient, dataOf } from "../../../services/api-client";
import type { ClassSchedule, RecommendationResponse, RoomPreference, ScheduleEntry } from "../../../types/api";
export const recommendationApi = {
  list: (limit = 5) => dataOf<RecommendationResponse>(apiClient.get("/student/room-recommendations", { params: { limit } })),
  preference: () => dataOf<RoomPreference | null>(apiClient.get("/student/room-preference/me")),
  savePreference: (input: Partial<Pick<RoomPreference, "pricePreference" | "wantsHotWater" | "occupancyPreference">>) => dataOf<RoomPreference>(apiClient.put("/student/room-preference/me", input)),
  deletePreference: () => dataOf<null>(apiClient.delete("/student/room-preference/me")),
  schedule: () => dataOf<ClassSchedule | null>(apiClient.get("/student/class-schedule/me")),
  saveSchedule: (entries: ScheduleEntry[]) => dataOf<ClassSchedule>(apiClient.put("/student/class-schedule/me", { entries })),
  deleteSchedule: () => dataOf<null>(apiClient.delete("/student/class-schedule/me")),
};
