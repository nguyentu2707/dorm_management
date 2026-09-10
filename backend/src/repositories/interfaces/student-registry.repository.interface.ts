import type {
  StudentRegistryDocument,
  StudentRegistryGender,
  StudentRegistryStatus,
} from "../../models/student-registry.model.js";
import type { TransactionContext } from "../../services/transaction-manager.js";
import type { PaginatedResult } from "../../types/common.types.js";

export type StudentRegistryData = {
  studentCode: string;
  fullName: string;
  email: string;
  gender: StudentRegistryGender;
  dateOfBirth?: Date;
};
export type StudentRegistryQuery = {
  page: number;
  limit: number;
  search?: string;
  gender?: StudentRegistryGender;
  status?: StudentRegistryStatus;
};
export interface IStudentRegistryRepository {
  findAll(
    query: StudentRegistryQuery,
  ): Promise<PaginatedResult<StudentRegistryDocument>>;
  findById(id: string): Promise<StudentRegistryDocument | null>;
  findByStudentCode(studentCode: string): Promise<StudentRegistryDocument | null>;
  findByStudentCodeForUpdate(
    studentCode: string,
    tx: TransactionContext,
  ): Promise<StudentRegistryDocument | null>;
  create(
    data: StudentRegistryData,
    tx?: TransactionContext,
  ): Promise<StudentRegistryDocument>;
  updateAvailable(
    id: string,
    data: Partial<StudentRegistryData>,
    tx?: TransactionContext,
  ): Promise<StudentRegistryDocument | null>;
  setAvailability(
    id: string,
    status: "AVAILABLE" | "DISABLED",
    tx?: TransactionContext,
  ): Promise<StudentRegistryDocument | null>;
  claim(
    id: string,
    userId: string,
    tx: TransactionContext,
  ): Promise<StudentRegistryDocument | null>;
}
