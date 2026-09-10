import type { IEquipmentItemRepository } from "../interfaces/equipment-item.repository.interface.js";
import type { EquipmentItemDocument } from "../../models/equipment-item.model.js";
import {
  query,
  rows,
  one,
  required,
  count,
  page,
  contains,
} from "../../database/query.js";
export class PostgresEquipmentItemRepository implements IEquipmentItemRepository {
  async findById(
    ...[id]: Parameters<IEquipmentItemRepository["findById"]>
  ): ReturnType<IEquipmentItemRepository["findById"]> {
    return one<EquipmentItemDocument>(
      `SELECT * FROM equipment_items WHERE id=$1`,
      [id],
      undefined,
    );
  }
  async findBySerialNumber(
    ...[serial]: Parameters<IEquipmentItemRepository["findBySerialNumber"]>
  ): ReturnType<IEquipmentItemRepository["findBySerialNumber"]> {
    return one<EquipmentItemDocument>(
      `SELECT * FROM equipment_items WHERE serial_number=$1`,
      [serial],
      undefined,
    );
  }
  async create(
    ...[d, s]: Parameters<IEquipmentItemRepository["create"]>
  ): ReturnType<IEquipmentItemRepository["create"]> {
    return required<EquipmentItemDocument>(
      `INSERT INTO equipment_items (category_id, room_id, serial_number, condition, purchase_date, purchase_price)
      VALUES ($1, $2, $3, COALESCE($4, 'NEW'), $5, $6)
      RETURNING *`,
      [
        d.categoryId,
        d.roomId,
        typeof d.serialNumber === "string"
          ? d.serialNumber.trim()
          : d.serialNumber,
        d.condition,
        d.purchaseDate,
        d.purchasePrice,
      ],
      s,
    );
  }
  async update(
    ...[id, d, s]: Parameters<IEquipmentItemRepository["update"]>
  ): ReturnType<IEquipmentItemRepository["update"]> {
    return one<EquipmentItemDocument>(
      `UPDATE equipment_items
      SET category_id = CASE WHEN $2::boolean THEN $3 ELSE category_id END, serial_number = CASE WHEN $4::boolean THEN $5 ELSE serial_number END, purchase_date = CASE WHEN $6::boolean THEN $7 ELSE purchase_date END, purchase_price = CASE WHEN $8::boolean THEN $9 ELSE purchase_price END, condition = CASE WHEN $10::boolean THEN $11 ELSE condition END, updated_at = now()
      WHERE id = $1
      RETURNING *`,
      [
        id,
        d.categoryId !== undefined,
        d.categoryId,
        d.serialNumber !== undefined,
        d.serialNumber,
        d.purchaseDate !== undefined,
        d.purchaseDate,
        d.purchasePrice !== undefined,
        d.purchasePrice,
        d.condition !== undefined,
        d.condition,
      ],
      s,
    );
  }
  async updateCondition(
    ...[id, condition, s]: Parameters<
      IEquipmentItemRepository["updateCondition"]
    >
  ): ReturnType<IEquipmentItemRepository["updateCondition"]> {
    return one<EquipmentItemDocument>(
      `UPDATE equipment_items SET condition=$2,updated_at=now() WHERE id=$1 RETURNING *`,
      [id, condition],
      s,
    );
  }
  async deleteById(
    ...[id, s]: Parameters<IEquipmentItemRepository["deleteById"]>
  ): ReturnType<IEquipmentItemRepository["deleteById"]> {
    await query(`DELETE FROM equipment_items WHERE id=$1`, [id], s);
  }
  async countByCategoryId(
    ...[id]: Parameters<IEquipmentItemRepository["countByCategoryId"]>
  ): ReturnType<IEquipmentItemRepository["countByCategoryId"]> {
    return count(
      `SELECT count(*) FROM equipment_items WHERE category_id=$1`,
      [id],
      undefined,
    );
  }
  async countByRoomId(
    ...[id]: Parameters<IEquipmentItemRepository["countByRoomId"]>
  ): ReturnType<IEquipmentItemRepository["countByRoomId"]> {
    return count(
      `SELECT count(*) FROM equipment_items WHERE room_id=$1`,
      [id],
      undefined,
    );
  }
  async findByRoomId(
    ...[id, pageNumber, limit]: Parameters<
      IEquipmentItemRepository["findByRoomId"]
    >
  ): ReturnType<IEquipmentItemRepository["findByRoomId"]> {
    return page<EquipmentItemDocument>(
      `SELECT * FROM equipment_items WHERE room_id=$1`,
      [id],
      { page: pageNumber, limit },
      "created_at DESC,id",
    );
  }
  async findAll(
    ...[q]: Parameters<IEquipmentItemRepository["findAll"]>
  ): ReturnType<IEquipmentItemRepository["findAll"]> {
    return page<Record<string, unknown>>(
      `SELECT e.id,e.serial_number,e.condition,e.purchase_date,e.purchase_price,
 json_build_object('id',c.id,'name',c.name) AS category,
 json_build_object('id',r.id,'roomNumber',r.room_number,'buildingId',b.id,'buildingName',b.name) AS room

      FROM equipment_items e
      JOIN equipment_categories c ON c.id=e.category_id
      JOIN rooms r ON r.id=e.room_id
      JOIN buildings b ON b.id=r.building_id

      WHERE ($1::text IS NULL OR e.serial_number ILIKE $1) AND ($2::uuid IS NULL OR e.category_id=$2) AND ($3::uuid IS NULL OR e.room_id=$3) AND ($4::uuid IS NULL OR r.building_id=$4) AND ($5::text IS NULL OR e.condition=$5)`,
      [contains(q.search), q.categoryId, q.roomId, q.buildingId, q.condition],
      q,
      "serial_number NULLS FIRST,id",
    );
  }
}
export { PostgresEquipmentItemRepository as EquipmentItemRepository };
