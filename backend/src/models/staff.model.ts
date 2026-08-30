import { Schema, model, type HydratedDocument, Types } from "mongoose";
export interface Staff {
  userId: Types.ObjectId;
  position: "MAINTENANCE" | "SECURITY" | "RECEPTIONIST" | "MANAGER";
  createdAt: Date;
  updatedAt: Date;
}
export type StaffDocument = HydratedDocument<Staff>;
const schema = new Schema<Staff>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    position: {
      type: String,
      enum: ["MAINTENANCE", "SECURITY", "RECEPTIONIST", "MANAGER"],
      required: true,
    },
  },
  { timestamps: true },
);
export const StaffModel = model<Staff>("Staff", schema);
