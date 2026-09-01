import { Schema, model, type HydratedDocument, Types } from "mongoose";

export const DAYS_OF_WEEK = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] as const;
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];
export type ScheduleEntry = { dayOfWeek: DayOfWeek; startPeriod: number; endPeriod: number };
export interface ClassSchedule { studentId: Types.ObjectId; entries: ScheduleEntry[]; createdAt: Date; updatedAt: Date }
export type ClassScheduleDocument = HydratedDocument<ClassSchedule>;
const entrySchema = new Schema<ScheduleEntry>({
  dayOfWeek: { type: String, enum: DAYS_OF_WEEK, required: true },
  startPeriod: { type: Number, required: true, min: 1 },
  endPeriod: { type: Number, required: true, min: 1 },
}, { _id: false });
const schema = new Schema<ClassSchedule>({
  studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true, unique: true },
  entries: { type: [entrySchema], default: [] },
}, { timestamps: true });
export const ClassScheduleModel = model<ClassSchedule>("ClassSchedule", schema);
