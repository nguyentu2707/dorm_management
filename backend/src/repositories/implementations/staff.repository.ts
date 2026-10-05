import type { IStaffRepository } from "../interfaces/staff.repository.interface.js";
import type { StaffDocument } from "../../models/staff.model.js";
import {
  contains,
  count,
  one,
  page,
  required,
  rows,
} from "../../database/query.js";
export class PostgresStaffRepository implements IStaffRepository {
  findById(id: string, tx?: Parameters<IStaffRepository["findById"]>[1]) {
    return one<StaffDocument>(
      `SELECT * FROM staff WHERE id=$1${tx ? " FOR UPDATE" : ""}`,
      [id],
      tx,
    );
  }
  list(q: Parameters<IStaffRepository["list"]>[0]) {
    const values: unknown[] = [contains(q.search), q.status];
    return page<Awaited<ReturnType<IStaffRepository["list"]>>["items"][number]>(
      `SELECT s.*,count(m.id) FILTER (WHERE m.status IN ('PENDING','IN_PROGRESS'))::int AS active_assignment_count
       FROM staff s LEFT JOIN maintenance_requests m ON m.assigned_staff_id=s.id
       WHERE ($1::text IS NULL OR s.staff_code ILIKE $1 ESCAPE '\\' OR s.full_name ILIKE $1 ESCAPE '\\')
       AND ($2::text IS NULL OR s.status=$2) GROUP BY s.id`,
      values,
      q,
      "s.full_name,s.id",
    );
  }
  findMaintenanceStaff() {
    return rows<
      Awaited<ReturnType<IStaffRepository["findMaintenanceStaff"]>>[number]
    >(
      `SELECT id,staff_code,full_name,specialty,status FROM staff WHERE status='ACTIVE' ORDER BY full_name,id`,
    );
  }
  create(
    data: Parameters<IStaffRepository["create"]>[0],
    tx: Parameters<IStaffRepository["create"]>[1],
  ) {
    return required<StaffDocument>(
      `INSERT INTO staff(staff_code,full_name,phone,specialty,status) VALUES($1,$2,$3,$4,'ACTIVE') RETURNING *`,
      [data.staffCode, data.fullName, data.phone, data.specialty],
      tx,
    );
  }
  update(
    id: string,
    data: Parameters<IStaffRepository["update"]>[1],
    tx: Parameters<IStaffRepository["update"]>[2],
  ) {
    return one<StaffDocument>(
      `UPDATE staff SET
      staff_code=COALESCE($2,staff_code),full_name=COALESCE($3,full_name),
      phone=CASE WHEN $4::boolean THEN $5 ELSE phone END,
      specialty=CASE WHEN $6::boolean THEN $7 ELSE specialty END,updated_at=now()
      WHERE id=$1 RETURNING *`,
      [
        id,
        data.staffCode,
        data.fullName,
        Object.hasOwn(data, "phone"),
        data.phone,
        Object.hasOwn(data, "specialty"),
        data.specialty,
      ],
      tx,
    );
  }
  updateStatus(
    id: string,
    status: "ACTIVE" | "INACTIVE",
    tx: Parameters<IStaffRepository["updateStatus"]>[2],
  ) {
    return one<StaffDocument>(
      `UPDATE staff SET status=$2,updated_at=now() WHERE id=$1 RETURNING *`,
      [id, status],
      tx,
    );
  }
  countActiveAssignments(
    id: string,
    tx: Parameters<IStaffRepository["countActiveAssignments"]>[1],
  ) {
    return count(
      `SELECT count(*) FROM maintenance_requests WHERE assigned_staff_id=$1 AND status IN ('PENDING','IN_PROGRESS')`,
      [id],
      tx,
    );
  }
}
export { PostgresStaffRepository as StaffRepository };
