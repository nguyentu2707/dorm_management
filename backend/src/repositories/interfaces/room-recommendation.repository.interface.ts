import type { ScheduleEntry } from "../../models/class-schedule.model.js";
export type RecommendationCandidate = {
  room: { id: string; roomNumber: string; building: { id: string; name: string }; pricePerMonth: number; capacity: number };
  availableBedCount: number;
  occupiedBedCount: number;
  hasHotWater: boolean;
  residentSchedules: ScheduleEntry[][];
};
export interface IRoomRecommendationRepository {
  findCandidates(): Promise<RecommendationCandidate[]>;
}
