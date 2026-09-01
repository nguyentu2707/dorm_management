import { Schema, model, type HydratedDocument, Types } from "mongoose";

export const PRICE_PREFERENCES = ["LOW", "MEDIUM", "ANY"] as const;
export const OCCUPANCY_PREFERENCES = ["MORE_EMPTY", "MORE_OCCUPIED", "ANY"] as const;
export type PricePreference = (typeof PRICE_PREFERENCES)[number];
export type OccupancyPreference = (typeof OCCUPANCY_PREFERENCES)[number];
export interface RoomPreference {
  studentId: Types.ObjectId;
  pricePreference?: PricePreference;
  wantsHotWater?: boolean | null;
  occupancyPreference?: OccupancyPreference;
  createdAt: Date;
  updatedAt: Date;
}
export type RoomPreferenceDocument = HydratedDocument<RoomPreference>;
const schema = new Schema<RoomPreference>({
  studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true, unique: true },
  pricePreference: { type: String, enum: PRICE_PREFERENCES },
  wantsHotWater: { type: Boolean, default: null },
  occupancyPreference: { type: String, enum: OCCUPANCY_PREFERENCES },
}, { timestamps: true });
export const RoomPreferenceModel = model<RoomPreference>("RoomPreference", schema);
