import type { ClientSession, Types } from "mongoose";
import type { StudentDocument } from "../../models/student.model.js";
export type UpdateStudentProfileData = {
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  permanentAddress?: string;
};
export interface IStudentRepository {
  findById(
    id: string,
    session?: ClientSession,
  ): Promise<StudentDocument | null>;
  findByUserId(
    userId: string,
    session?: ClientSession,
  ): Promise<StudentDocument | null>;
  findByMssv(mssv: string): Promise<StudentDocument | null>;
  create(
    data: { userId: Types.ObjectId; mssv: string },
    session?: ClientSession,
  ): Promise<StudentDocument>;
  updateProfile(
    id: string,
    data: UpdateStudentProfileData,
    session?: ClientSession,
  ): Promise<StudentDocument | null>;
}
