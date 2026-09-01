import { Schema, model, type HydratedDocument, Types } from "mongoose";
export interface NotificationRecipient {
  notificationId: Types.ObjectId;
  studentId: Types.ObjectId;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
export type NotificationRecipientDocument =
  HydratedDocument<NotificationRecipient>;
const schema = new Schema<NotificationRecipient>(
  {
    notificationId: {
      type: Schema.Types.ObjectId,
      ref: "Notification",
      required: true,
    },
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    isRead: { type: Boolean, default: false },
    readAt: Date,
  },
  { timestamps: true },
);
schema.index({ notificationId: 1, studentId: 1 }, { unique: true });
schema.index({ studentId: 1, isRead: 1, createdAt: -1 });
export const NotificationRecipientModel = model<NotificationRecipient>(
  "NotificationRecipient",
  schema,
);
