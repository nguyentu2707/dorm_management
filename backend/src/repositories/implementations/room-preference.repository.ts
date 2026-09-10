import type { IRoomPreferenceRepository } from "../interfaces/room-preference.repository.interface.js";
import type { RoomPreferenceDocument } from "../../models/room-preference.model.js";
import {
  query,
  rows,
  one,
  required,
  count,
  page,
  contains,
} from "../../database/query.js";
export class PostgresRoomPreferenceRepository implements IRoomPreferenceRepository {
  async findByStudentId(
    ...[id]: Parameters<IRoomPreferenceRepository["findByStudentId"]>
  ): ReturnType<IRoomPreferenceRepository["findByStudentId"]> {
    return one<RoomPreferenceDocument>(
      `SELECT * FROM room_preferences WHERE student_id=$1`,
      [id],
      undefined,
    );
  }
  async upsert(
    ...[id, d]: Parameters<IRoomPreferenceRepository["upsert"]>
  ): ReturnType<IRoomPreferenceRepository["upsert"]> {
    return required<RoomPreferenceDocument>(
      `INSERT INTO room_preferences(student_id,price_preference,wants_hot_water,occupancy_preference)
      VALUES ($1,$2,$3,$4)
      ON CONFLICT ON CONSTRAINT uq_room_preferences_student_id DO UPDATE
      SET price_preference=CASE WHEN $5 THEN EXCLUDED.price_preference ELSE room_preferences.price_preference END,wants_hot_water=CASE WHEN $6 THEN EXCLUDED.wants_hot_water ELSE room_preferences.wants_hot_water END,occupancy_preference=CASE WHEN $7 THEN EXCLUDED.occupancy_preference ELSE room_preferences.occupancy_preference END,updated_at=now()
      RETURNING *`,
      [
        id,
        d.pricePreference,
        d.wantsHotWater,
        d.occupancyPreference,
        d.pricePreference !== undefined,
        d.wantsHotWater !== undefined,
        d.occupancyPreference !== undefined,
      ],
    );
  }
  async deleteByStudentId(
    ...[id]: Parameters<IRoomPreferenceRepository["deleteByStudentId"]>
  ): ReturnType<IRoomPreferenceRepository["deleteByStudentId"]> {
    await query(
      `DELETE FROM room_preferences WHERE student_id=$1`,
      [id],
      undefined,
    );
  }
}
export { PostgresRoomPreferenceRepository as RoomPreferenceRepository };
