import type { IBuildingRepository } from "../interfaces/building.repository.interface.js";
import type { BuildingDocument } from "../../models/building.model.js";
import type { BuildingFloorRoom, BuildingSummary } from "../interfaces/building.repository.interface.js";
import {
  query,
  rows,
  one,
  required,
  count,
  page,
  contains,
} from "../../database/query.js";
export class PostgresBuildingRepository implements IBuildingRepository {
  async findAll(
    ...[]: Parameters<IBuildingRepository["findAll"]>
  ): ReturnType<IBuildingRepository["findAll"]> {
    return rows<BuildingDocument>(
      `SELECT * FROM buildings WHERE true ORDER BY name, id`,
      [],
      undefined,
    );
  }
  async findAllWithSummaries(): Promise<BuildingSummary[]> {
    return rows<BuildingSummary>(`SELECT b.*,
      count(DISTINCT r.floor)::integer AS "floorCount",
      count(DISTINCT r.id)::integer AS "roomCount",
      count(bed.id)::integer AS "totalBeds",
      count(bed.id) FILTER (WHERE bed.status='OCCUPIED')::integer AS "occupiedBeds",
      count(bed.id) FILTER (WHERE bed.status='EMPTY')::integer AS "emptyBeds"
      FROM buildings b
      LEFT JOIN rooms r ON r.building_id=b.id
      LEFT JOIN beds bed ON bed.room_id=r.id
      GROUP BY b.id
      ORDER BY b.name,b.id`);
  }
  async findFloorRooms(id: string): Promise<BuildingFloorRoom[]> {
    return rows<BuildingFloorRoom>(`SELECT r.id,r.room_number,r.floor,r.status,r.room_type_id,
      rt.name AS "roomTypeName",rt.capacity,
      count(bed.id)::integer AS "totalBeds",
      count(bed.id) FILTER (WHERE bed.status='OCCUPIED')::integer AS "occupiedBeds",
      count(bed.id) FILTER (WHERE bed.status='EMPTY')::integer AS "emptyBeds"
      FROM rooms r
      JOIN room_types rt ON rt.id=r.room_type_id
      LEFT JOIN beds bed ON bed.room_id=r.id
      WHERE r.building_id=$1
      GROUP BY r.id,rt.id
      ORDER BY r.floor DESC,r.room_number,r.id`, [id]);
  }
  async findById(
    ...[id, s]: Parameters<IBuildingRepository["findById"]>
  ): ReturnType<IBuildingRepository["findById"]> {
    return one<BuildingDocument>(
      `SELECT * FROM buildings WHERE id = $1`,
      [id],
      s,
    );
  }
  async create(
    ...[d, s]: Parameters<IBuildingRepository["create"]>
  ): ReturnType<IBuildingRepository["create"]> {
    return required<BuildingDocument>(
      `INSERT INTO buildings (name, address, description, status, allowed_gender) VALUES ($1, $2, $3, COALESCE($4,'ACTIVE'), COALESCE($5,'MIXED')) RETURNING *`,
      [
        typeof d.name === "string" ? d.name.trim() : d.name,
        d.address,
        d.description,
        d.status,
        d.allowedGender,
      ],
      s,
    );
  }
  async update(
    ...[id, d, s]: Parameters<IBuildingRepository["update"]>
  ): ReturnType<IBuildingRepository["update"]> {
    return one<BuildingDocument>(
      `UPDATE buildings
      SET name = CASE WHEN $2::boolean THEN $3 ELSE name END, address = CASE WHEN $4::boolean THEN $5 ELSE address END, description = CASE WHEN $6::boolean THEN $7 ELSE description END,
      status = CASE WHEN $8::boolean THEN $9 ELSE status END, allowed_gender = CASE WHEN $10::boolean THEN $11 ELSE allowed_gender END, updated_at = now()
      WHERE id = $1
      RETURNING *`,
      [
        id,
        d.name !== undefined,
        d.name,
        d.address !== undefined,
        d.address,
        d.description !== undefined,
        d.description,
        d.status !== undefined,
        d.status,
        d.allowedGender !== undefined,
        d.allowedGender,
      ],
      s,
    );
  }
  async deleteById(
    ...[id, s]: Parameters<IBuildingRepository["deleteById"]>
  ): ReturnType<IBuildingRepository["deleteById"]> {
    await query(`DELETE FROM buildings WHERE id = $1`, [id], s);
  }
}
export { PostgresBuildingRepository as BuildingRepository };
