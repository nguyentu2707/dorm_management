export const PRICE_PREFERENCES = ["LOW", "MEDIUM", "ANY"] as const;
export const OCCUPANCY_PREFERENCES = [
  "MORE_EMPTY",
  "MORE_OCCUPIED",
  "ANY",
] as const;
export type PricePreference = (typeof PRICE_PREFERENCES)[number];
export type OccupancyPreference = (typeof OCCUPANCY_PREFERENCES)[number];
export interface RoomPreference {
  studentId: string;
  pricePreference?: PricePreference;
  wantsHotWater?: boolean | null;
  occupancyPreference?: OccupancyPreference;
  createdAt: Date;
  updatedAt: Date;
}
export type RoomPreferenceDocument = RoomPreference & { id: string };
