import type { StudentRegistryDocument } from "../../models/student-registry.model.js";
import { contains, one, page, required } from "../../database/query.js";
import type { IStudentRegistryRepository } from "../interfaces/student-registry.repository.interface.js";

export class PostgresStudentRegistryRepository
  implements IStudentRegistryRepository
{
  async findAll(
    ...[q]: Parameters<IStudentRegistryRepository["findAll"]>
  ): ReturnType<IStudentRegistryRepository["findAll"]> {
    return page<StudentRegistryDocument>(
      `SELECT * FROM student_registry
       WHERE ($1::text IS NULL OR status=$1)
         AND ($2::text IS NULL OR gender=$2)
         AND ($3::text IS NULL OR student_code ILIKE $3 OR full_name ILIKE $3 OR email ILIKE $3)`,
      [q.status, q.gender, contains(q.search)],
      q,
      "student_code,id",
    );
  }
  async findById(
    ...[id]: Parameters<IStudentRegistryRepository["findById"]>
  ): ReturnType<IStudentRegistryRepository["findById"]> {
    return one<StudentRegistryDocument>(
      `SELECT * FROM student_registry WHERE id=$1`,
      [id],
    );
  }
  async findByStudentCode(
    ...[studentCode]: Parameters<
      IStudentRegistryRepository["findByStudentCode"]
    >
  ): ReturnType<IStudentRegistryRepository["findByStudentCode"]> {
    return one<StudentRegistryDocument>(
      `SELECT * FROM student_registry WHERE student_code=$1`,
      [studentCode],
    );
  }
  async findByStudentCodeForUpdate(
    ...[studentCode, tx]: Parameters<
      IStudentRegistryRepository["findByStudentCodeForUpdate"]
    >
  ): ReturnType<IStudentRegistryRepository["findByStudentCodeForUpdate"]> {
    return one<StudentRegistryDocument>(
      `SELECT * FROM student_registry WHERE student_code=$1 FOR UPDATE`,
      [studentCode],
      tx,
    );
  }
  async create(
    ...[data, tx]: Parameters<IStudentRegistryRepository["create"]>
  ): ReturnType<IStudentRegistryRepository["create"]> {
    return required<StudentRegistryDocument>(
      `INSERT INTO student_registry(student_code,full_name,email,gender,date_of_birth)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [
        data.studentCode,
        data.fullName,
        data.email,
        data.gender,
        data.dateOfBirth,
      ],
      tx,
    );
  }
  async updateAvailable(
    ...[id, data, tx]: Parameters<
      IStudentRegistryRepository["updateAvailable"]
    >
  ): ReturnType<IStudentRegistryRepository["updateAvailable"]> {
    return one<StudentRegistryDocument>(
      `UPDATE student_registry SET
       student_code=CASE WHEN $2::boolean THEN $3 ELSE student_code END,
       full_name=CASE WHEN $4::boolean THEN $5 ELSE full_name END,
       email=CASE WHEN $6::boolean THEN $7 ELSE email END,
       gender=CASE WHEN $8::boolean THEN $9 ELSE gender END,
       date_of_birth=CASE WHEN $10::boolean THEN $11 ELSE date_of_birth END,
       updated_at=now()
       WHERE id=$1 AND status IN ('AVAILABLE','DISABLED') RETURNING *`,
      [
        id,
        data.studentCode !== undefined,
        data.studentCode,
        data.fullName !== undefined,
        data.fullName,
        data.email !== undefined,
        data.email,
        data.gender !== undefined,
        data.gender,
        data.dateOfBirth !== undefined,
        data.dateOfBirth,
      ],
      tx,
    );
  }
  async setAvailability(
    ...[id, status, tx]: Parameters<
      IStudentRegistryRepository["setAvailability"]
    >
  ): ReturnType<IStudentRegistryRepository["setAvailability"]> {
    return one<StudentRegistryDocument>(
      `UPDATE student_registry SET status=$2,updated_at=now()
       WHERE id=$1 AND status IN ('AVAILABLE','DISABLED') RETURNING *`,
      [id, status],
      tx,
    );
  }
  async claim(
    ...[id, userId, tx]: Parameters<IStudentRegistryRepository["claim"]>
  ): ReturnType<IStudentRegistryRepository["claim"]> {
    return one<StudentRegistryDocument>(
      `UPDATE student_registry
       SET status='CLAIMED',claimed_user_id=$2,updated_at=now()
       WHERE id=$1 AND status='AVAILABLE' AND claimed_user_id IS NULL
       RETURNING *`,
      [id, userId],
      tx,
    );
  }
}
export { PostgresStudentRegistryRepository as StudentRegistryRepository };
