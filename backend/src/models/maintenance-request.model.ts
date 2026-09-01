import { Schema, model, type HydratedDocument, Types } from "mongoose";
export const MAINTENANCE_CATEGORIES = [
  "ELECTRICAL",
  "PLUMBING",
  "FURNITURE",
  "APPLIANCE",
  "OTHER",
] as const;
export const MAINTENANCE_STATUSES = [
  "PENDING",
  "IN_PROGRESS",
  "RESOLVED",
  "CANCELLED",
] as const;
export type MaintenanceCategory = (typeof MAINTENANCE_CATEGORIES)[number];
export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number];
export interface MaintenanceRequest {
  studentId: Types.ObjectId;
  roomId: Types.ObjectId;
  equipmentItemId?: Types.ObjectId;
  category: MaintenanceCategory;
  description: string;
  status: MaintenanceStatus;
  assignedStaffId?: Types.ObjectId;
  resolvedAt?: Date;
  resolutionNote?: string;
  cancelledAt?: Date;
  cancelReason?: string;
  createdAt: Date;
  updatedAt: Date;
}
export type MaintenanceRequestDocument = HydratedDocument<MaintenanceRequest>;
const schema = new Schema<MaintenanceRequest>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true },
    equipmentItemId: { type: Schema.Types.ObjectId, ref: "EquipmentItem" },
    category: { type: String, enum: MAINTENANCE_CATEGORIES, required: true },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    status: { type: String, enum: MAINTENANCE_STATUSES, default: "PENDING" },
    assignedStaffId: { type: Schema.Types.ObjectId, ref: "Staff" },
    resolvedAt: Date,
    resolutionNote: String,
    cancelledAt: Date,
    cancelReason: String,
  },
  { timestamps: true },
);
schema.index({ studentId: 1, status: 1, createdAt: -1 });
schema.index({ roomId: 1, status: 1, createdAt: -1 });
schema.index({ assignedStaffId: 1, status: 1 });
export const MaintenanceRequestModel = model<MaintenanceRequest>(
  "MaintenanceRequest",
  schema,
);
