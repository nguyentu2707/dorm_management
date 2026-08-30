import { Schema, model, type HydratedDocument, Types } from "mongoose";
export interface Student {
  userId: Types.ObjectId;
  mssv: string;
  className?: string;
  faculty?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  dob?: Date;
  cccd?: string;
  permanentAddress?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  createdAt: Date;
  updatedAt: Date;
}
export type StudentDocument = HydratedDocument<Student>;
const schema = new Schema<Student>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    mssv: { type: String, required: true, trim: true, unique: true },
    className: String,
    faculty: String,
    gender: { type: String, enum: ["MALE", "FEMALE", "OTHER"] },
    dob: Date,
    cccd: String,
    permanentAddress: String,
    emergencyContactName: String,
    emergencyContactPhone: String,
  },
  { timestamps: true },
);
export const StudentModel = model<Student>("Student", schema);
