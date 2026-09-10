import type { IMaintenanceRequestRepository } from "../interfaces/maintenance-request.repository.interface.js";
import type { MaintenanceRequestDocument } from "../../models/maintenance-request.model.js";
import {
  query,
  rows,
  one,
  required,
  count,
  page,
  contains,
} from "../../database/query.js";
export class PostgresMaintenanceRequestRepository implements IMaintenanceRequestRepository {
  async create(
    ...[d]: Parameters<IMaintenanceRequestRepository["create"]>
  ): ReturnType<IMaintenanceRequestRepository["create"]> {
    return required<MaintenanceRequestDocument>(
      `INSERT INTO maintenance_requests (student_id, room_id, equipment_item_id, category, description) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        d.studentId,
        d.roomId,
        d.equipmentItemId,
        d.category,
        typeof d.description === "string"
          ? d.description.trim()
          : d.description,
      ],
      undefined,
    );
  }
  async findById(
    ...[id]: Parameters<IMaintenanceRequestRepository["findById"]>
  ): ReturnType<IMaintenanceRequestRepository["findById"]> {
    return one<MaintenanceRequestDocument>(
      `SELECT * FROM maintenance_requests WHERE id=$1`,
      [id],
      undefined,
    );
  }
  async findByStudentId(
    ...[id]: Parameters<IMaintenanceRequestRepository["findByStudentId"]>
  ): ReturnType<IMaintenanceRequestRepository["findByStudentId"]> {
    return rows<MaintenanceRequestDocument>(
      `SELECT * FROM maintenance_requests WHERE student_id=$1 ORDER BY created_at DESC,id`,
      [id],
      undefined,
    );
  }
  async update(
    ...[id, d]: Parameters<IMaintenanceRequestRepository["update"]>
  ): ReturnType<IMaintenanceRequestRepository["update"]> {
    return one<MaintenanceRequestDocument>(
      `UPDATE maintenance_requests
      SET equipment_item_id = CASE WHEN $2::boolean THEN $3 ELSE equipment_item_id END, category = CASE WHEN $4::boolean THEN $5 ELSE category END, description = CASE WHEN $6::boolean THEN $7 ELSE description END, status = CASE WHEN $8::boolean THEN $9 ELSE status END, assigned_staff_id = CASE WHEN $10::boolean THEN $11 ELSE assigned_staff_id END, processing_started_at = CASE WHEN $12::boolean THEN $13 ELSE processing_started_at END, resolved_at = CASE WHEN $14::boolean THEN $15 ELSE resolved_at END, resolution_note = CASE WHEN $16::boolean THEN $17 ELSE resolution_note END, resolution_method = CASE WHEN $18::boolean THEN $19 ELSE resolution_method END, resolution_reason = CASE WHEN $20::boolean THEN $21 ELSE resolution_reason END, resolution_cost = CASE WHEN $22::boolean THEN $23 ELSE resolution_cost END, damage_cause = CASE WHEN $24::boolean THEN $25 ELSE damage_cause END, damage_cause_detail = CASE WHEN $26::boolean THEN $27 ELSE damage_cause_detail END, cancelled_at = CASE WHEN $28::boolean THEN $29 ELSE cancelled_at END, cancel_reason = CASE WHEN $30::boolean THEN $31 ELSE cancel_reason END, updated_at = now()
      WHERE id = $1
      RETURNING *`,
      [
        id,
        d.equipmentItemId !== undefined,
        d.equipmentItemId,
        d.category !== undefined,
        d.category,
        d.description !== undefined,
        d.description,
        d.status !== undefined,
        d.status,
        d.assignedStaffId !== undefined,
        d.assignedStaffId,
        d.processingStartedAt !== undefined,
        d.processingStartedAt,
        d.resolvedAt !== undefined,
        d.resolvedAt,
        d.resolutionNote !== undefined,
        d.resolutionNote,
        d.resolutionMethod !== undefined,
        d.resolutionMethod,
        d.resolutionReason !== undefined,
        d.resolutionReason,
        d.resolutionCost !== undefined,
        d.resolutionCost,
        d.damageCause !== undefined,
        d.damageCause,
        d.damageCauseDetail !== undefined,
        d.damageCauseDetail,
        d.cancelledAt !== undefined,
        d.cancelledAt,
        d.cancelReason !== undefined,
        d.cancelReason,
      ],
      undefined,
    );
  }
  async findAll(
    ...[q]: Parameters<IMaintenanceRequestRepository["findAll"]>
  ): ReturnType<IMaintenanceRequestRepository["findAll"]> {
    return page<MaintenanceRequestDocument>(
      `SELECT m.*
      FROM maintenance_requests m
      JOIN rooms r ON r.id=m.room_id
      WHERE ($1::text IS NULL OR m.status=$1) AND ($2::uuid IS NULL OR m.room_id=$2) AND ($3::text IS NULL OR m.category=$3) AND ($4::uuid IS NULL OR m.assigned_staff_id=$4) AND ($5::uuid IS NULL OR r.building_id=$5)`,
      [q.status, q.roomId, q.category, q.assignedStaffId, q.buildingId],
      q,
      "m.created_at DESC,m.id",
    );
  }
  async countOperational(
    ...[]: Parameters<IMaintenanceRequestRepository["countOperational"]>
  ): ReturnType<IMaintenanceRequestRepository["countOperational"]> {
    return required<{
      pending: number;
      inProgress: number;
    }>(`SELECT count(*) FILTER(WHERE status='PENDING') AS pending,count(*) FILTER(WHERE status='IN_PROGRESS') AS "inProgress"
      FROM maintenance_requests`);
  }
}
export { PostgresMaintenanceRequestRepository as MaintenanceRequestRepository };
