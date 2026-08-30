import { Schema, model, type HydratedDocument, Types } from "mongoose";

export const ROOM_CHANGE_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
] as const;
export type RoomChangeRequestStatus = (typeof ROOM_CHANGE_STATUSES)[number];
export interface RoomChangeRequest {
  studentId: Types.ObjectId;
  currentContractId: Types.ObjectId;
  targetBedId: Types.ObjectId;
  reason?: string;
  status: RoomChangeRequestStatus;
  processedBy?: Types.ObjectId;
  processedAt?: Date;
  rejectReason?: string;
  createdAt: Date;
  updatedAt: Date;
}
export type RoomChangeRequestDocument = HydratedDocument<RoomChangeRequest>;
const schema = new Schema<RoomChangeRequest>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    currentContractId: {
      type: Schema.Types.ObjectId,
      ref: "Contract",
      required: true,
    },
    targetBedId: { type: Schema.Types.ObjectId, ref: "Bed", required: true },
    reason: String,
    status: { type: String, enum: ROOM_CHANGE_STATUSES, required: true },
    processedBy: { type: Schema.Types.ObjectId, ref: "User" },
    processedAt: Date,
    rejectReason: String,
  },
  { timestamps: true },
);
schema.index({ studentId: 1, status: 1 });
schema.index({ status: 1, createdAt: -1 });
schema.index(
  { studentId: 1 },
  { unique: true, partialFilterExpression: { status: "PENDING" } },
);
export const RoomChangeRequestModel = model<RoomChangeRequest>(
  "RoomChangeRequest",
  schema,
);
