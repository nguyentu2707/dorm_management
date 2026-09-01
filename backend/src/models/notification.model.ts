import { Schema, model, type HydratedDocument, Types } from "mongoose";

export const NOTIFICATION_TARGET_SCOPES = [
  "ALL",
  "BUILDING",
  "SPECIFIC_STUDENT",
] as const;
export type NotificationTargetScope =
  (typeof NOTIFICATION_TARGET_SCOPES)[number];

export interface Notification {
  title: string;
  content: string;
  targetScope: NotificationTargetScope;
  targetBuildingId?: Types.ObjectId;
  targetStudentId?: Types.ObjectId;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
export type NotificationDocument = HydratedDocument<Notification>;

const schema = new Schema<Notification>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, required: true, trim: true, maxlength: 2000 },
    targetScope: {
      type: String,
      enum: NOTIFICATION_TARGET_SCOPES,
      required: true,
    },
    targetBuildingId: { type: Schema.Types.ObjectId, ref: "Building" },
    targetStudentId: { type: Schema.Types.ObjectId, ref: "Student" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);
schema.index({ createdAt: -1 });
schema.index({ targetScope: 1, createdAt: -1 });
export const NotificationModel = model<Notification>("Notification", schema);
