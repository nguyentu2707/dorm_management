import { ClassScheduleModel, type ScheduleEntry } from "../../models/class-schedule.model.js";
import type { IClassScheduleRepository } from "../interfaces/class-schedule.repository.interface.js";
export class ClassScheduleRepository implements IClassScheduleRepository {
  findByStudentId(id: string) { return ClassScheduleModel.findOne({ studentId: id }).exec(); }
  upsert(id: string, entries: ScheduleEntry[]) {
    return ClassScheduleModel.findOneAndUpdate({ studentId: id }, { $set: { entries } }, { upsert: true, new: true, runValidators: true }).exec();
  }
  async deleteByStudentId(id: string) { await ClassScheduleModel.deleteOne({ studentId: id }); }
}
