import type { IStaffRepository } from "../interfaces/staff.repository.interface.js";
import type { StaffDocument } from "../../models/staff.model.js";
import {
  query,
  rows,
  one,
  required,
  count,
  page,
  contains,
} from "../../database/query.js";
export class PostgresStaffRepository implements IStaffRepository {
  async findById(
    ...[id]: Parameters<IStaffRepository["findById"]>
  ): ReturnType<IStaffRepository["findById"]> {
    return one<StaffDocument>(
      `SELECT * FROM staff WHERE id=$1`,
      [id],
      undefined,
    );
  }
  async findMaintenanceStaff(
    ...[]: Parameters<IStaffRepository["findMaintenanceStaff"]>
  ): ReturnType<IStaffRepository["findMaintenanceStaff"]> {
    return rows<{
      id: string;
      fullName: string;
      username: string;
    }>(`SELECT s.id,u.full_name,u.username
      FROM staff s
      JOIN users u ON u.id=s.user_id
      WHERE s.position='MAINTENANCE' AND u.status='ACTIVE'
      ORDER BY u.full_name,s.id`);
  }
}
export { PostgresStaffRepository as StaffRepository };
