import type { StaffDocument } from "../../models/staff.model.js";
export interface IStaffRepository {
  findById(id: string): Promise<StaffDocument | null>;
  findMaintenanceStaff(): Promise<
    Array<{ id: string; fullName: string; username: string }>
  >;
}
