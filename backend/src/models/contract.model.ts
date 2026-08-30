import { Schema, model, type HydratedDocument, Types } from "mongoose";

export const CONTRACT_STATUSES = [
  "PENDING",
  "ACTIVE",
  "ENDED",
  "CANCELLED",
  "REJECTED",
] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export interface Contract {
  studentId: Types.ObjectId;
  bedId: Types.ObjectId;
  roomId: Types.ObjectId;
  startDate: Date;
  endDate: Date;
  status: ContractStatus;
  rejectReason?: string;
  cancelReason?: string;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type ContractDocument = HydratedDocument<Contract>;
const schema = new Schema<Contract>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    bedId: { type: Schema.Types.ObjectId, ref: "Bed", required: true },
    roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: CONTRACT_STATUSES, required: true },
    rejectReason: String,
    cancelReason: String,
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: Date,
    endedAt: Date,
  },
  { timestamps: true },
);
schema.index({ studentId: 1, status: 1 });
schema.index({ bedId: 1, status: 1 });
schema.index({ roomId: 1, status: 1 });
schema.index(
  { studentId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["PENDING", "ACTIVE"] } },
  },
);
export const ContractModel = model<Contract>("Contract", schema);
