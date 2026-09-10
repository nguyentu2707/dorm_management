import type { RefreshSessionDocument } from "../../models/refresh-session.model.js";
import { one, query, required } from "../../database/query.js";
import type { IRefreshSessionRepository } from "../interfaces/refresh-session.repository.interface.js";

export class PostgresRefreshSessionRepository
  implements IRefreshSessionRepository
{
  async create(
    ...[data, tx]: Parameters<IRefreshSessionRepository["create"]>
  ): ReturnType<IRefreshSessionRepository["create"]> {
    return required<RefreshSessionDocument>(
      `INSERT INTO refresh_sessions(id,user_id,token_hash,expires_at,user_agent)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [data.id, data.userId, data.tokenHash, data.expiresAt, data.userAgent],
      tx,
    );
  }
  async findByIdForUpdate(
    ...[id, tx]: Parameters<IRefreshSessionRepository["findByIdForUpdate"]>
  ): ReturnType<IRefreshSessionRepository["findByIdForUpdate"]> {
    return one<RefreshSessionDocument>(
      `SELECT * FROM refresh_sessions WHERE id=$1 FOR UPDATE`,
      [id],
      tx,
    );
  }
  async revokeIfActive(
    ...[id, usedAt, tx]: Parameters<IRefreshSessionRepository["revokeIfActive"]>
  ): ReturnType<IRefreshSessionRepository["revokeIfActive"]> {
    return (
      (await query(
        `UPDATE refresh_sessions
         SET revoked_at=$2,last_used_at=$2
         WHERE id=$1 AND revoked_at IS NULL`,
        [id, usedAt],
        tx,
      )).rowCount === 1
    );
  }
  async revokeAllByUserId(
    ...[userId, tx]: Parameters<
      IRefreshSessionRepository["revokeAllByUserId"]
    >
  ): ReturnType<IRefreshSessionRepository["revokeAllByUserId"]> {
    return (
      (await query(
        `UPDATE refresh_sessions SET revoked_at=now()
         WHERE user_id=$1 AND revoked_at IS NULL`,
        [userId],
        tx,
      )).rowCount ?? 0
    );
  }
  async deleteExpiredOrOldRevoked(
    ...[before]: Parameters<
      IRefreshSessionRepository["deleteExpiredOrOldRevoked"]
    >
  ): ReturnType<IRefreshSessionRepository["deleteExpiredOrOldRevoked"]> {
    return (
      (await query(
        `DELETE FROM refresh_sessions
         WHERE expires_at<$1 OR (revoked_at IS NOT NULL AND revoked_at<$1)`,
        [before],
      )).rowCount ?? 0
    );
  }
}
export { PostgresRefreshSessionRepository as RefreshSessionRepository };
