import type { IEquipmentCategoryRepository } from "../interfaces/equipment-category.repository.interface.js";
import type { EquipmentCategoryDocument } from "../../models/equipment-category.model.js";
import {
  query,
  rows,
  one,
  required,
  count,
  page,
  contains,
} from "../../database/query.js";
export class PostgresEquipmentCategoryRepository implements IEquipmentCategoryRepository {
  async findAll(
    ...[]: Parameters<IEquipmentCategoryRepository["findAll"]>
  ): ReturnType<IEquipmentCategoryRepository["findAll"]> {
    return rows<EquipmentCategoryDocument>(
      `SELECT * FROM equipment_categories WHERE true ORDER BY name, id`,
      [],
      undefined,
    );
  }
  async findById(
    ...[id]: Parameters<IEquipmentCategoryRepository["findById"]>
  ): ReturnType<IEquipmentCategoryRepository["findById"]> {
    return one<EquipmentCategoryDocument>(
      `SELECT * FROM equipment_categories WHERE id = $1`,
      [id],
      undefined,
    );
  }
  async create(
    ...[d, s]: Parameters<IEquipmentCategoryRepository["create"]>
  ): ReturnType<IEquipmentCategoryRepository["create"]> {
    return required<EquipmentCategoryDocument>(
      `INSERT INTO equipment_categories (name, unit, default_lifespan_months) VALUES ($1, $2, $3) RETURNING *`,
      [
        typeof d.name === "string" ? d.name.trim() : d.name,
        typeof d.unit === "string" ? d.unit.trim() : d.unit,
        d.defaultLifespanMonths,
      ],
      s,
    );
  }
  async update(
    ...[id, d, s]: Parameters<IEquipmentCategoryRepository["update"]>
  ): ReturnType<IEquipmentCategoryRepository["update"]> {
    return one<EquipmentCategoryDocument>(
      `UPDATE equipment_categories
      SET name = CASE WHEN $2::boolean THEN $3 ELSE name END, unit = CASE WHEN $4::boolean THEN $5 ELSE unit END, default_lifespan_months = CASE WHEN $6::boolean THEN $7 ELSE default_lifespan_months END, updated_at = now()
      WHERE id = $1
      RETURNING *`,
      [
        id,
        d.name !== undefined,
        d.name,
        d.unit !== undefined,
        d.unit,
        d.defaultLifespanMonths !== undefined,
        d.defaultLifespanMonths,
      ],
      s,
    );
  }
  async deleteById(
    ...[id, s]: Parameters<IEquipmentCategoryRepository["deleteById"]>
  ): ReturnType<IEquipmentCategoryRepository["deleteById"]> {
    await query(`DELETE FROM equipment_categories WHERE id = $1`, [id], s);
  }
}
export { PostgresEquipmentCategoryRepository as EquipmentCategoryRepository };
