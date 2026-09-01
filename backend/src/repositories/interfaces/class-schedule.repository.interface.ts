import type { ClassScheduleDocument, ScheduleEntry } from "../../models/class-schedule.model.js";
export interface IClassScheduleRepository {
  findByStudentId(id: string): Promise<ClassScheduleDocument | null>;
  upsert(id: string, entries: ScheduleEntry[]): Promise<ClassScheduleDocument>;
  deleteByStudentId(id: string): Promise<void>;
}
