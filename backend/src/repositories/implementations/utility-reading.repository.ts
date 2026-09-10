import type { IUtilityReadingRepository } from "../interfaces/utility-reading.repository.interface.js";
import type { UtilityReadingDocument } from "../../models/utility-reading.model.js";
import {
  query,
  rows,
  one,
  required,
  count,
  page,
  contains,
} from "../../database/query.js";
export class PostgresUtilityReadingRepository implements IUtilityReadingRepository {
  async findById(
    ...[id, s]: Parameters<IUtilityReadingRepository["findById"]>
  ): ReturnType<IUtilityReadingRepository["findById"]> {
    return one<UtilityReadingDocument>(
      `SELECT * FROM utility_readings WHERE id=$1`,
      [id],
      s,
    );
  }
  async findByRoomAndPeriod(
    ...[roomId, period, s]: Parameters<
      IUtilityReadingRepository["findByRoomAndPeriod"]
    >
  ): ReturnType<IUtilityReadingRepository["findByRoomAndPeriod"]> {
    return one<UtilityReadingDocument>(
      `SELECT * FROM utility_readings WHERE room_id=$1 AND billing_period=$2`,
      [roomId, period],
      s,
    );
  }
  async findLatestByRoom(
    ...[roomId, s]: Parameters<IUtilityReadingRepository["findLatestByRoom"]>
  ): ReturnType<IUtilityReadingRepository["findLatestByRoom"]> {
    return one<UtilityReadingDocument>(
      `SELECT * FROM utility_readings WHERE room_id=$1 ORDER BY billing_period DESC LIMIT 1`,
      [roomId],
      s,
    );
  }
  async findPreviousBeforePeriod(
    ...[roomId, period, s]: Parameters<
      IUtilityReadingRepository["findPreviousBeforePeriod"]
    >
  ): ReturnType<IUtilityReadingRepository["findPreviousBeforePeriod"]> {
    return one<UtilityReadingDocument>(
      `SELECT * FROM utility_readings WHERE room_id=$1 AND billing_period<$2 ORDER BY billing_period DESC LIMIT 1`,
      [roomId, period],
      s,
    );
  }
  async findByRoom(
    ...[roomId]: Parameters<IUtilityReadingRepository["findByRoom"]>
  ): ReturnType<IUtilityReadingRepository["findByRoom"]> {
    return rows<UtilityReadingDocument>(
      `SELECT * FROM utility_readings WHERE room_id=$1 ORDER BY billing_period DESC`,
      [roomId],
      undefined,
    );
  }
  async create(
    ...[d, s]: Parameters<IUtilityReadingRepository["create"]>
  ): ReturnType<IUtilityReadingRepository["create"]> {
    return required<UtilityReadingDocument>(
      `INSERT INTO utility_readings (room_id, billing_period, electricity_previous, electricity_current, electricity_usage, electricity_unit_price, electricity_amount, water_previous, water_current, water_usage, water_unit_price, water_amount, recorded_by, monthly_billing_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        d.roomId,
        d.billingPeriod,
        d.electricityPrevious,
        d.electricityCurrent,
        d.electricityUsage,
        d.electricityUnitPrice,
        d.electricityAmount,
        d.waterPrevious,
        d.waterCurrent,
        d.waterUsage,
        d.waterUnitPrice,
        d.waterAmount,
        d.recordedBy,
        d.monthlyBillingId,
      ],
      s,
    );
  }
  async update(
    ...[id, d, s]: Parameters<IUtilityReadingRepository["update"]>
  ): ReturnType<IUtilityReadingRepository["update"]> {
    return one<UtilityReadingDocument>(
      `UPDATE utility_readings
      SET electricity_previous = CASE WHEN $2::boolean THEN $3 ELSE electricity_previous END, electricity_current = CASE WHEN $4::boolean THEN $5 ELSE electricity_current END, electricity_usage = CASE WHEN $6::boolean THEN $7 ELSE electricity_usage END, electricity_unit_price = CASE WHEN $8::boolean THEN $9 ELSE electricity_unit_price END, electricity_amount = CASE WHEN $10::boolean THEN $11 ELSE electricity_amount END, water_previous = CASE WHEN $12::boolean THEN $13 ELSE water_previous END, water_current = CASE WHEN $14::boolean THEN $15 ELSE water_current END, water_usage = CASE WHEN $16::boolean THEN $17 ELSE water_usage END, water_unit_price = CASE WHEN $18::boolean THEN $19 ELSE water_unit_price END, water_amount = CASE WHEN $20::boolean THEN $21 ELSE water_amount END, updated_at = now() 
      WHERE id = $1
      RETURNING *`,
      [
        id,
        d.electricityPrevious !== undefined,
        d.electricityPrevious,
        d.electricityCurrent !== undefined,
        d.electricityCurrent,
        d.electricityUsage !== undefined,
        d.electricityUsage,
        d.electricityUnitPrice !== undefined,
        d.electricityUnitPrice,
        d.electricityAmount !== undefined,
        d.electricityAmount,
        d.waterPrevious !== undefined,
        d.waterPrevious,
        d.waterCurrent !== undefined,
        d.waterCurrent,
        d.waterUsage !== undefined,
        d.waterUsage,
        d.waterUnitPrice !== undefined,
        d.waterUnitPrice,
        d.waterAmount !== undefined,
        d.waterAmount,
      ],
      s,
    );
  }
  async findAll(
    ...[q]: Parameters<IUtilityReadingRepository["findAll"]>
  ): ReturnType<IUtilityReadingRepository["findAll"]> {
    return page<Record<string, unknown>>(
      `SELECT ur.*,json_build_object('id',r.id,'roomNumber',r.room_number) AS room,json_build_object('id',b.id,'name',b.name) AS building
      FROM utility_readings ur
      JOIN rooms r ON r.id=ur.room_id
      JOIN buildings b ON b.id=r.building_id
      WHERE ($1::uuid IS NULL OR ur.room_id=$1) AND ($2::text IS NULL OR ur.billing_period=$2) AND ($3::uuid IS NULL OR r.building_id=$3)`,
      [q.roomId, q.billingPeriod, q.buildingId],
      q,
      "ur.billing_period DESC,r.room_number,ur.id",
    );
  }
}
export { PostgresUtilityReadingRepository as UtilityReadingRepository };
