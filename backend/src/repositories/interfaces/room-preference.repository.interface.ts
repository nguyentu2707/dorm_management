import type { RoomPreferenceDocument, PricePreference, OccupancyPreference } from "../../models/room-preference.model.js";
export type RoomPreferenceData = { pricePreference?: PricePreference; wantsHotWater?: boolean | null; occupancyPreference?: OccupancyPreference };
export interface IRoomPreferenceRepository {
  findByStudentId(id: string): Promise<RoomPreferenceDocument | null>;
  upsert(id: string, data: RoomPreferenceData): Promise<RoomPreferenceDocument>;
  deleteByStudentId(id: string): Promise<void>;
}
