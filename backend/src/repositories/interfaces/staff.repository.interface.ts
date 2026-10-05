import type { StaffDocument } from "../../models/staff.model.js";
import type { PaginatedResult } from "../../types/common.types.js";
import type { TransactionContext } from "../../services/transaction-manager.js";
export type StaffInput = { staffCode: string; fullName: string; phone?: string; specialty?: string };
export type StaffListItem = StaffDocument & { activeAssignmentCount: number };
export interface IStaffRepository {
  findById(id: string, tx?: TransactionContext): Promise<StaffDocument | null>;
  list(q: { page: number; limit: number; search?: string; status?: "ACTIVE" | "INACTIVE" }): Promise<PaginatedResult<StaffListItem>>;
  findMaintenanceStaff(): Promise<Array<{ id: string; staffCode: string; fullName: string; specialty?: string; status: "ACTIVE" | "INACTIVE" }>>;
  create(data: StaffInput, tx: TransactionContext): Promise<StaffDocument>;
  update(id: string, data: Partial<StaffInput>, tx: TransactionContext): Promise<StaffDocument | null>;
  updateStatus(id: string, status: "ACTIVE" | "INACTIVE", tx: TransactionContext): Promise<StaffDocument | null>;
  countActiveAssignments(id: string, tx: TransactionContext): Promise<number>;
}
