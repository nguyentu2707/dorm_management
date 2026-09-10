import type { IRoomRepository } from "../interfaces/room.repository.interface.js";
import type { RoomDocument } from "../../models/room.model.js";
import {
  query,
  rows,
  one,
  required,
  count,
  page,
  contains,
} from "../../database/query.js";
export class PostgresRoomRepository implements IRoomRepository {
  async findById(
    ...[id, s]: Parameters<IRoomRepository["findById"]>
  ): ReturnType<IRoomRepository["findById"]> {
    return one<RoomDocument>(
      `SELECT * FROM rooms WHERE id=$1 ${s ? "FOR UPDATE" : ""}`,
      [id],
      s,
    );
  }
  async lockUtilityLedger(
    ...[id, s]: Parameters<IRoomRepository["lockUtilityLedger"]>
  ): ReturnType<IRoomRepository["lockUtilityLedger"]> {
    await query(
      `SELECT room_id FROM room_billing_cursors WHERE room_id=$1 FOR UPDATE`,
      [id],
      s,
    );
  }
  async findByBuildingId(
    ...[id, q]: Parameters<IRoomRepository["findByBuildingId"]>
  ): ReturnType<IRoomRepository["findByBuildingId"]> {
    return page<RoomDocument>(
      `SELECT *
      FROM rooms
      WHERE building_id=$1 AND ($2::text IS NULL OR room_number ILIKE $2) AND ($3::text IS NULL OR status=$3) AND ($4::uuid IS NULL OR room_type_id=$4) AND ($5::integer IS NULL OR floor=$5)`,
      [id, contains(q.search), q.status, q.roomTypeId, q.floor],
      q,
      "floor, room_number, id",
    );
  }
  async findByRoomNumberAndBuildingId(
    ...[n, b]: Parameters<IRoomRepository["findByRoomNumberAndBuildingId"]>
  ): ReturnType<IRoomRepository["findByRoomNumberAndBuildingId"]> {
    return one<RoomDocument>(
      `SELECT * FROM rooms WHERE room_number=$1 AND building_id=$2`,
      [n, b],
      undefined,
    );
  }
  async countByBuildingId(
    ...[id]: Parameters<IRoomRepository["countByBuildingId"]>
  ): ReturnType<IRoomRepository["countByBuildingId"]> {
    return count(
      `SELECT count(*) FROM rooms WHERE building_id=$1`,
      [id],
      undefined,
    );
  }
  async countByRoomTypeId(
    ...[id, s]: Parameters<IRoomRepository["countByRoomTypeId"]>
  ): ReturnType<IRoomRepository["countByRoomTypeId"]> {
    return count(
      `SELECT count(*) FROM rooms WHERE room_type_id=$1`,
      [id],
      s,
    );
  }
  async create(
    ...[d, s]: Parameters<IRoomRepository["create"]>
  ): ReturnType<IRoomRepository["create"]> {
    return required<RoomDocument>(
      `INSERT INTO rooms (building_id, room_type_id, room_number, floor, status) VALUES ($1, $2, $3, $4, COALESCE($5, 'AVAILABLE')) RETURNING *`,
      [
        d.buildingId,
        d.roomTypeId,
        typeof d.roomNumber === "string" ? d.roomNumber.trim() : d.roomNumber,
        d.floor,
        d.status,
      ],
      s,
    );
  }
  async update(
    ...[id, d, s]: Parameters<IRoomRepository["update"]>
  ): ReturnType<IRoomRepository["update"]> {
    return one<RoomDocument>(
      `UPDATE rooms
      SET room_type_id = CASE WHEN $2::boolean THEN $3 ELSE room_type_id END, room_number = CASE WHEN $4::boolean THEN $5 ELSE room_number END, floor = CASE WHEN $6::boolean THEN $7 ELSE floor END, status = CASE WHEN $8::boolean THEN $9 ELSE status END, updated_at = now()
      WHERE id = $1
      RETURNING *`,
      [
        id,
        d.roomTypeId !== undefined,
        d.roomTypeId,
        d.roomNumber !== undefined,
        d.roomNumber,
        d.floor !== undefined,
        d.floor,
        d.status !== undefined,
        d.status,
      ],
      s,
    );
  }
  async updateStatus(
    ...[id, status, s]: Parameters<IRoomRepository["updateStatus"]>
  ): ReturnType<IRoomRepository["updateStatus"]> {
    return one<RoomDocument>(
      `UPDATE rooms SET status=$2,updated_at=now() WHERE id=$1 RETURNING *`,
      [id, status],
      s,
    );
  }
  async deleteById(
    ...[id, s]: Parameters<IRoomRepository["deleteById"]>
  ): ReturnType<IRoomRepository["deleteById"]> {
    await query(`DELETE FROM rooms WHERE id=$1`, [id], s);
  }
}
export { PostgresRoomRepository as RoomRepository };
