import type { IRoomTypeRepository } from "../interfaces/room-type.repository.interface.js";
import type { RoomTypeDocument } from "../../models/room-type.model.js";
import {
  query,
  rows,
  one,
  required,
  count,
  page,
  contains,
} from "../../database/query.js";
export class PostgresRoomTypeRepository implements IRoomTypeRepository {
  async findAll(
    ...[]: Parameters<IRoomTypeRepository["findAll"]>
  ): ReturnType<IRoomTypeRepository["findAll"]> {
    return rows<RoomTypeDocument>(
      `SELECT * FROM room_types WHERE true ORDER BY name, id`,
      [],
      undefined,
    );
  }
  async findById(
    ...[id, s]: Parameters<IRoomTypeRepository["findById"]>
  ): ReturnType<IRoomTypeRepository["findById"]> {
    return one<RoomTypeDocument>(
      `SELECT * FROM room_types WHERE id = $1`,
      [id],
      s,
    );
  }
  async findByIdForUpdate(
    ...[id, s]: Parameters<IRoomTypeRepository["findByIdForUpdate"]>
  ): ReturnType<IRoomTypeRepository["findByIdForUpdate"]> {
    return one<RoomTypeDocument>(
      `SELECT * FROM room_types WHERE id = $1 FOR UPDATE`,
      [id],
      s,
    );
  }
  async create(
    ...[d, s]: Parameters<IRoomTypeRepository["create"]>
  ): ReturnType<IRoomTypeRepository["create"]> {
    return required<RoomTypeDocument>(
      `INSERT INTO room_types (name, capacity, price_per_month, description) VALUES ($1, $2, $3, $4) RETURNING *`,
      [
        typeof d.name === "string" ? d.name.trim() : d.name,
        d.capacity,
        d.pricePerMonth,
        d.description,
      ],
      s,
    );
  }
  async update(
    ...[id, d, s]: Parameters<IRoomTypeRepository["update"]>
  ): ReturnType<IRoomTypeRepository["update"]> {
    return one<RoomTypeDocument>(
      `UPDATE room_types
      SET name = CASE WHEN $2::boolean THEN $3 ELSE name END, capacity = CASE WHEN $4::boolean THEN $5 ELSE capacity END, price_per_month = CASE WHEN $6::boolean THEN $7 ELSE price_per_month END, description = CASE WHEN $8::boolean THEN $9 ELSE description END, updated_at = now()
      WHERE id = $1
      RETURNING *`,
      [
        id,
        d.name !== undefined,
        d.name,
        d.capacity !== undefined,
        d.capacity,
        d.pricePerMonth !== undefined,
        d.pricePerMonth,
        d.description !== undefined,
        d.description,
      ],
      s,
    );
  }
  async deleteById(
    ...[id, s]: Parameters<IRoomTypeRepository["deleteById"]>
  ): ReturnType<IRoomTypeRepository["deleteById"]> {
    await query(`DELETE FROM room_types WHERE id = $1`, [id], s);
  }
}
export { PostgresRoomTypeRepository as RoomTypeRepository };
