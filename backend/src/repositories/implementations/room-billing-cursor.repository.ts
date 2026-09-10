import type { IRoomBillingCursorRepository } from "../interfaces/room-billing-cursor.repository.interface.js";
import type { RoomBillingCursorDocument } from "../../models/room-billing-cursor.model.js";
import {
  query,
  rows,
  one,
  required,
  count,
  page,
  contains,
} from "../../database/query.js";
export class PostgresRoomBillingCursorRepository implements IRoomBillingCursorRepository {
  async ensureForRoom(
    ...[roomId]: Parameters<IRoomBillingCursorRepository["ensureForRoom"]>
  ): ReturnType<IRoomBillingCursorRepository["ensureForRoom"]> {
    return required<RoomBillingCursorDocument>(
      `SELECT *,room_id AS id FROM room_billing_cursors WHERE room_id=$1`,
      [roomId],
    );
  }
  async findByRoom(
    ...[roomId, s]: Parameters<IRoomBillingCursorRepository["findByRoom"]>
  ): ReturnType<IRoomBillingCursorRepository["findByRoom"]> {
    return one<RoomBillingCursorDocument>(
      `SELECT *,room_id AS id FROM room_billing_cursors WHERE room_id=$1 ${s ? "FOR UPDATE" : ""}`,
      [roomId],
      s,
    );
  }
  async advance(
    ...[roomId, expected, next, s]: Parameters<
      IRoomBillingCursorRepository["advance"]
    >
  ): ReturnType<IRoomBillingCursorRepository["advance"]> {
    return one<RoomBillingCursorDocument>(
      `UPDATE room_billing_cursors
      SET latest_finalized_billing_period=$3,version=version+1,updated_at=now()
      WHERE room_id=$1 AND latest_finalized_billing_period IS NOT DISTINCT
      FROM $2::text AND ($2::text IS NULL OR $3::text>$2::text)
      RETURNING *,room_id AS id`,
      [roomId, expected, next],
      s,
    );
  }
}
export { PostgresRoomBillingCursorRepository as RoomBillingCursorRepository };
