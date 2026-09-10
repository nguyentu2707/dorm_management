import type { IUserRepository } from "../interfaces/user.repository.interface.js";
import type { UserDocument } from "../../models/user.model.js";
import {
  query,
  rows,
  one,
  required,
  count,
  page,
  contains,
} from "../../database/query.js";
export class PostgresUserRepository implements IUserRepository {
  async findById(
    ...[id, s]: Parameters<IUserRepository["findById"]>
  ): ReturnType<IUserRepository["findById"]> {
    return one<UserDocument>(
      `SELECT * FROM users WHERE id=$1`,
      [id],
      s,
    );
  }
  async findByIdForUpdate(
    ...[id, s]: Parameters<IUserRepository["findByIdForUpdate"]>
  ): ReturnType<IUserRepository["findByIdForUpdate"]> {
    return one<UserDocument>(
      `SELECT * FROM users WHERE id=$1 FOR UPDATE`,
      [id],
      s,
    );
  }
  async findByUsername(
    ...[username, s]: Parameters<IUserRepository["findByUsername"]>
  ): ReturnType<IUserRepository["findByUsername"]> {
    return one<UserDocument>(
      `SELECT * FROM users WHERE username=$1`,
      [username],
      s,
    );
  }
  async findByEmailNormalized(
    ...[email, s]: Parameters<IUserRepository["findByEmailNormalized"]>
  ): ReturnType<IUserRepository["findByEmailNormalized"]> {
    return one<UserDocument>(
      `SELECT * FROM users WHERE lower(btrim(email))=$1`,
      [email],
      s,
    );
  }
  async create(
    ...[d, s]: Parameters<IUserRepository["create"]>
  ): ReturnType<IUserRepository["create"]> {
    return required<UserDocument>(
      `INSERT INTO users (username, password_hash, role, full_name, email) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        typeof d.username === "string" ? d.username.trim() : d.username,
        d.passwordHash,
        d.role,
        typeof d.fullName === "string" ? d.fullName.trim() : d.fullName,
        typeof d.email === "string" ? d.email.trim().toLowerCase() : d.email,
      ],
      s,
    );
  }
  async updateProfile(
    ...[id, d, s]: Parameters<IUserRepository["updateProfile"]>
  ): ReturnType<IUserRepository["updateProfile"]> {
    return one<UserDocument>(
      `UPDATE users
      SET full_name = CASE WHEN $2::boolean THEN $3 ELSE full_name END, email = CASE WHEN $4::boolean THEN $5 ELSE email END, phone = CASE WHEN $6::boolean THEN $7 ELSE phone END, updated_at = now()
      WHERE id = $1
      RETURNING *`,
      [
        id,
        d.fullName !== undefined,
        d.fullName,
        d.email !== undefined,
        d.email,
        d.phone !== undefined,
        d.phone,
      ],
      s,
    );
  }
  async updatePassword(
    ...[id, passwordHash, s]: Parameters<IUserRepository["updatePassword"]>
  ): ReturnType<IUserRepository["updatePassword"]> {
    return one<UserDocument>(
      `UPDATE users SET password_hash=$2, updated_at=now() WHERE id=$1 RETURNING *`,
      [id, passwordHash],
      s,
    );
  }
  async updateStatus(
    ...[id, status, s]: Parameters<IUserRepository["updateStatus"]>
  ): ReturnType<IUserRepository["updateStatus"]> {
    return one<UserDocument>(
      `UPDATE users SET status=$2,updated_at=now() WHERE id=$1 RETURNING *`,
      [id, status],
      s,
    );
  }
  async deleteById(
    ...[id, s]: Parameters<IUserRepository["deleteById"]>
  ): ReturnType<IUserRepository["deleteById"]> {
    await query(`DELETE FROM users WHERE id=$1`, [id], s);
  }
}
export { PostgresUserRepository as UserRepository };
