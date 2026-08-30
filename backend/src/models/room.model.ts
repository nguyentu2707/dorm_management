import { Schema, model, type HydratedDocument, Types } from "mongoose";
export const ROOM_STATUSES = [
  "AVAILABLE",
  "FULL",
  "MAINTENANCE",
  "LOCKED",
] as const;
export type RoomStatus = (typeof ROOM_STATUSES)[number];
export interface Room {
  buildingId: Types.ObjectId;
  roomTypeId: Types.ObjectId;
  roomNumber: string;
  floor: number;
  status: RoomStatus;
  createdAt: Date;
  updatedAt: Date;
}
export type RoomDocument = HydratedDocument<Room>;
const schema = new Schema<Room>(
  {
    buildingId: {
      type: Schema.Types.ObjectId,
      ref: "Building",
      required: true,
    },
    roomTypeId: {
      type: Schema.Types.ObjectId,
      ref: "RoomType",
      required: true,
    },
    roomNumber: { type: String, required: true, trim: true },
    floor: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ROOM_STATUSES, default: "AVAILABLE" },
  },
  { timestamps: true },
);
schema.index({ buildingId: 1, roomNumber: 1 }, { unique: true });
export const RoomModel = model<Room>("Room", schema);
