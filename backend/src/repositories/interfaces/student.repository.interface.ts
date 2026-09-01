import type { ClientSession, Types } from "mongoose";
import type { StudentDocument } from "../../models/student.model.js";
import type { ContractStatus } from "../../models/contract.model.js";
import type { PaginatedResult } from "../../types/common.types.js";
export type AdminStudentRecord = {
  id: string;
  userId: string;
  mssv: string;
  fullName: string;
  email?: string;
  phone?: string;
  className?: string;
  faculty?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  dob?: Date;
  cccd?: string;
  permanentAddress?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  hasOpenContract: boolean;
  currentContractStatus: ContractStatus | null;
  currentContractId: string | null;
};
export type StudentSearchQuery = {
  page: number;
  limit: number;
  search?: string;
  faculty?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
};
export type UpdateStudentProfileData = {
  dob?: Date;
  gender?: "MALE" | "FEMALE" | "OTHER";
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
  search(q: StudentSearchQuery): Promise<PaginatedResult<AdminStudentRecord>>;
  findAdminDetail(id: string): Promise<AdminStudentRecord | null>;
  create(
    data: { userId: Types.ObjectId; mssv: string },
    session?: ClientSession,
  ): Promise<StudentDocument>;
  updateProfile(
    id: string,
    data: UpdateStudentProfileData,
    session?: ClientSession,
  ): Promise<StudentDocument | null>;
  findActiveIds(session?: ClientSession): Promise<Types.ObjectId[]>;
  isActive(id: string, session?: ClientSession): Promise<boolean>;
}
