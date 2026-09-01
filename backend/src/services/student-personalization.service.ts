import { AppError } from "../errors/AppError.js";
import type { IStudentRepository } from "../repositories/interfaces/student.repository.interface.js";
import type { IRoomPreferenceRepository, RoomPreferenceData } from "../repositories/interfaces/room-preference.repository.interface.js";
import type { IClassScheduleRepository } from "../repositories/interfaces/class-schedule.repository.interface.js";
import type { ScheduleEntry } from "../models/class-schedule.model.js";

export class StudentPersonalizationService {
  constructor(private students: IStudentRepository, private preferences: IRoomPreferenceRepository, private schedules: IClassScheduleRepository) {}
  private async studentId(userId: string) {
    const student = await this.students.findByUserId(userId);
    if (!student) throw new AppError(404, "STUDENT_NOT_FOUND", "Không tìm thấy sinh viên");
    return student.id;
  }
  private preferenceResponse(item: Awaited<ReturnType<IRoomPreferenceRepository["findByStudentId"]>>) {
    return item ? { id: item.id, pricePreference: item.pricePreference, wantsHotWater: item.wantsHotWater, occupancyPreference: item.occupancyPreference, createdAt: item.createdAt, updatedAt: item.updatedAt } : null;
  }
  private scheduleResponse(item: Awaited<ReturnType<IClassScheduleRepository["findByStudentId"]>>) {
    return item ? { id: item.id, entries: item.entries, createdAt: item.createdAt, updatedAt: item.updatedAt } : null;
  }
  async getPreference(userId: string) { return this.preferenceResponse(await this.preferences.findByStudentId(await this.studentId(userId))); }
  async putPreference(userId: string, data: RoomPreferenceData) { return this.preferenceResponse(await this.preferences.upsert(await this.studentId(userId), data)); }
  async deletePreference(userId: string) { await this.preferences.deleteByStudentId(await this.studentId(userId)); }
  async getSchedule(userId: string) { return this.scheduleResponse(await this.schedules.findByStudentId(await this.studentId(userId))); }
  async putSchedule(userId: string, entries: ScheduleEntry[]) { return this.scheduleResponse(await this.schedules.upsert(await this.studentId(userId), entries)); }
  async deleteSchedule(userId: string) { await this.schedules.deleteByStudentId(await this.studentId(userId)); }
}
