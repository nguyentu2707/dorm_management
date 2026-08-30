import { StudentModel } from "../../models/student.model.js";
import type {
  IStudentRepository,
  UpdateStudentProfileData,
} from "../interfaces/student.repository.interface.js";
import type { ClientSession, Types } from "mongoose";
export class StudentRepository implements IStudentRepository {
  findById(id: string, s?: ClientSession) {
    return StudentModel.findById(id)
      .session(s ?? null)
      .exec();
  }
  findByUserId(userId: string, s?: ClientSession) {
    return StudentModel.findOne({ userId })
      .session(s ?? null)
      .exec();
  }
  findByMssv(m: string) {
    return StudentModel.findOne({ mssv: m }).exec();
  }
  async create(d: { userId: Types.ObjectId; mssv: string }, s?: ClientSession) {
    const [x] = await StudentModel.create([d], { session: s });
    return x!;
  }

  updateProfile(id: string, data: UpdateStudentProfileData, s?: ClientSession) {
    return StudentModel.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
      session: s,
    }).exec();
  }
}
