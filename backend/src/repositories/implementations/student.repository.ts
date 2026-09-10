import type { IStudentRepository } from "../interfaces/student.repository.interface.js";
import type { StudentDocument } from "../../models/student.model.js";
import type { AdminStudentRecord } from "../interfaces/student.repository.interface.js";
import {
  query,
  rows,
  one,
  required,
  count,
  page,
  contains,
} from "../../database/query.js";
export class PostgresStudentRepository implements IStudentRepository {
  async findById(
    ...[id, s]: Parameters<IStudentRepository["findById"]>
  ): ReturnType<IStudentRepository["findById"]> {
    return one<StudentDocument>(`SELECT * FROM students WHERE id=$1`, [id], s);
  }
  async findByUserId(
    ...[id, s]: Parameters<IStudentRepository["findByUserId"]>
  ): ReturnType<IStudentRepository["findByUserId"]> {
    return one<StudentDocument>(
      `SELECT * FROM students WHERE user_id=$1`,
      [id],
      s,
    );
  }
  async findByMssv(
    ...[id]: Parameters<IStudentRepository["findByMssv"]>
  ): ReturnType<IStudentRepository["findByMssv"]> {
    return one<StudentDocument>(
      `SELECT * FROM students WHERE mssv=$1`,
      [id],
      undefined,
    );
  }
  async create(
    ...[d, s]: Parameters<IStudentRepository["create"]>
  ): ReturnType<IStudentRepository["create"]> {
    return required<StudentDocument>(
      `INSERT INTO students (user_id, mssv, gender, dob) VALUES ($1, $2, $3, $4) RETURNING *`,
      [
        d.userId,
        typeof d.mssv === "string" ? d.mssv.trim().toUpperCase() : d.mssv,
        d.gender,
        d.dob,
      ],
      s,
    );
  }
  async updateProfile(
    ...[id, d, s]: Parameters<IStudentRepository["updateProfile"]>
  ): ReturnType<IStudentRepository["updateProfile"]> {
    return one<StudentDocument>(
      `UPDATE students
      SET dob = CASE WHEN $2::boolean THEN $3 ELSE dob END, gender = CASE WHEN $4::boolean THEN $5 ELSE gender END, emergency_contact_name = CASE WHEN $6::boolean THEN $7 ELSE emergency_contact_name END, emergency_contact_phone = CASE WHEN $8::boolean THEN $9 ELSE emergency_contact_phone END, permanent_address = CASE WHEN $10::boolean THEN $11 ELSE permanent_address END, updated_at = now()
      WHERE id = $1
      RETURNING *`,
      [
        id,
        d.dob !== undefined,
        d.dob,
        d.gender !== undefined,
        d.gender,
        d.emergencyContactName !== undefined,
        d.emergencyContactName,
        d.emergencyContactPhone !== undefined,
        d.emergencyContactPhone,
        d.permanentAddress !== undefined,
        d.permanentAddress,
      ],
      s,
    );
  }
  async lockResidenceIntent(
    ...[id, s]: Parameters<IStudentRepository["lockResidenceIntent"]>
  ): ReturnType<IStudentRepository["lockResidenceIntent"]> {
    await query(`SELECT id FROM students WHERE id=$1 FOR UPDATE`, [id], s);
  }
  async isActive(
    ...[id, s]: Parameters<IStudentRepository["isActive"]>
  ): ReturnType<IStudentRepository["isActive"]> {
    return (
      (await count(
        `SELECT count(*) FROM students s JOIN users u ON u.id=s.user_id WHERE s.id=$1 AND u.status='ACTIVE'`,
        [id],
        s,
      )) > 0
    );
  }
  async findActiveIds(
    ...[s]: Parameters<IStudentRepository["findActiveIds"]>
  ): ReturnType<IStudentRepository["findActiveIds"]> {
    return (
      await rows<{ id: string }>(
        `SELECT s.id FROM students s JOIN users u ON u.id=s.user_id WHERE u.status='ACTIVE' ORDER BY s.id`,
        [],
        s,
      )
    ).map((x) => x.id);
  }
  async search(
    ...[q]: Parameters<IStudentRepository["search"]>
  ): ReturnType<IStudentRepository["search"]> {
    return page<AdminStudentRecord>(
      `SELECT s.*, u.full_name, u.email, u.phone, (c.id IS NOT NULL) AS "hasOpenContract", c.id AS "currentContractId", c.status AS "currentContractStatus"
      FROM students s
      JOIN users u ON u.id=s.user_id
      LEFT
      JOIN contracts c ON c.student_id=s.id AND c.status IN ('PENDING','ACTIVE')
      WHERE ($1::text IS NULL OR s.faculty=$1) AND ($2::text IS NULL OR s.gender=$2) AND ($3::text IS NULL OR s.mssv ILIKE $3 OR u.full_name ILIKE $3 OR u.email ILIKE $3)`,
      [q.faculty, q.gender, contains(q.search)],
      q,
      "mssv, id",
    );
  }
  async findAdminDetail(
    ...[id]: Parameters<IStudentRepository["findAdminDetail"]>
  ): ReturnType<IStudentRepository["findAdminDetail"]> {
    return one<AdminStudentRecord>(
      `SELECT s.*, u.full_name, u.email, u.phone, (c.id IS NOT NULL) AS "hasOpenContract", c.id AS "currentContractId", c.status AS "currentContractStatus"
      FROM students s
      JOIN users u ON u.id=s.user_id
      LEFT
      JOIN contracts c ON c.student_id=s.id AND c.status IN ('PENDING','ACTIVE')
      WHERE s.id=$1`,
      [id],
    );
  }
}
export { PostgresStudentRepository as StudentRepository };
