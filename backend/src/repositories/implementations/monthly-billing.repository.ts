import type { IMonthlyBillingRepository } from "../interfaces/monthly-billing.repository.interface.js";
import type { MonthlyBillingDocument } from "../../models/monthly-billing.model.js";
import {
  query,
  rows,
  one,
  required,
  count,
  page,
  contains,
} from "../../database/query.js";
export class PostgresMonthlyBillingRepository implements IMonthlyBillingRepository {
  async findById(
    ...[id, s]: Parameters<IMonthlyBillingRepository["findById"]>
  ): ReturnType<IMonthlyBillingRepository["findById"]> {
    return one<MonthlyBillingDocument>(
      `SELECT *, (SELECT id
      FROM utility_readings ur
      WHERE ur.monthly_billing_id = monthly_billings.id) AS utility_reading_id
      FROM monthly_billings
      WHERE id=$1`,
      [id],
      s,
    );
  }
  async findByRoomAndPeriod(
    ...[roomId, period, s]: Parameters<
      IMonthlyBillingRepository["findByRoomAndPeriod"]
    >
  ): ReturnType<IMonthlyBillingRepository["findByRoomAndPeriod"]> {
    return one<MonthlyBillingDocument>(
      `SELECT *, (SELECT id
      FROM utility_readings ur
      WHERE ur.monthly_billing_id = monthly_billings.id) AS utility_reading_id
      FROM monthly_billings
      WHERE room_id=$1 AND billing_period=$2`,
      [roomId, period],
      s,
    );
  }
  async create(
    ...[d, s]: Parameters<IMonthlyBillingRepository["create"]>
  ): ReturnType<IMonthlyBillingRepository["create"]> {
    return required<MonthlyBillingDocument>(
      `INSERT INTO monthly_billings (room_id, billing_period, status, draft_electricity_previous, draft_electricity_current, draft_water_previous, draft_water_current, building_name_snapshot, room_number_snapshot, electricity_previous, electricity_current, electricity_usage, electricity_unit_price, electricity_amount, water_previous, water_current, water_usage, water_unit_price, water_amount, wifi_fee, trash_fee, shared_service_total, total_invoice_amount, finalized_by, finalized_at, cancelled_by, cancelled_at, cancel_reason)
      VALUES ($1, $2, COALESCE($3, 'DRAFT'), $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
      RETURNING *`,
      [
        d.roomId,
        d.billingPeriod,
        d.status,
        d.draftElectricityPrevious,
        d.draftElectricityCurrent,
        d.draftWaterPrevious,
        d.draftWaterCurrent,
        d.buildingNameSnapshot,
        d.roomNumberSnapshot,
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
        d.wifiFee,
        d.trashFee,
        d.sharedServiceTotal,
        d.totalInvoiceAmount,
        d.finalizedBy,
        d.finalizedAt,
        d.cancelledBy,
        d.cancelledAt,
        d.cancelReason,
      ],
      s,
    );
  }
  async findAll(
    ...[q]: Parameters<IMonthlyBillingRepository["findAll"]>
  ): ReturnType<IMonthlyBillingRepository["findAll"]> {
    return page<Record<string, unknown>>(
      `SELECT mb.*,(SELECT id
      FROM utility_readings
      WHERE monthly_billing_id=mb.id) AS utility_reading_id,json_build_object('id',r.id,'roomNumber',r.room_number) AS room,json_build_object('id',b.id,'name',b.name) AS building
      FROM monthly_billings mb
      JOIN rooms r ON r.id=mb.room_id
      JOIN buildings b ON b.id=r.building_id
      WHERE ($1::uuid IS NULL OR mb.room_id=$1) AND ($2::text IS NULL OR mb.billing_period=$2) AND ($3::text IS NULL OR mb.status=$3) AND ($4::uuid IS NULL OR r.building_id=$4)`,
      [q.roomId, q.billingPeriod, q.status, q.buildingId],
      q,
      "mb.billing_period DESC,mb.room_number_snapshot,mb.id",
    );
  }
  async upsertDraft(
    ...[roomId, period, d]: Parameters<IMonthlyBillingRepository["upsertDraft"]>
  ): ReturnType<IMonthlyBillingRepository["upsertDraft"]> {
    return one<MonthlyBillingDocument>(
      `INSERT INTO monthly_billings(room_id,billing_period,draft_electricity_previous,draft_electricity_current,draft_water_previous,draft_water_current)
      VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT ON CONSTRAINT uq_monthly_billings_room_period DO UPDATE
      SET draft_electricity_previous=EXCLUDED.draft_electricity_previous,draft_electricity_current=EXCLUDED.draft_electricity_current,draft_water_previous=EXCLUDED.draft_water_previous,draft_water_current=EXCLUDED.draft_water_current,updated_at=now()
      WHERE monthly_billings.status='DRAFT'
      RETURNING *`,
      [
        roomId,
        period,
        d.draftElectricityPrevious,
        d.draftElectricityCurrent,
        d.draftWaterPrevious,
        d.draftWaterCurrent,
      ],
    );
  }
  async finalizeDraft(
    ...[id, d, s]: Parameters<IMonthlyBillingRepository["finalizeDraft"]>
  ): ReturnType<IMonthlyBillingRepository["finalizeDraft"]> {
    return one<MonthlyBillingDocument>(
      `UPDATE monthly_billings
      SET building_name_snapshot = CASE WHEN $2::boolean THEN $3 ELSE building_name_snapshot END, room_number_snapshot = CASE WHEN $4::boolean THEN $5 ELSE room_number_snapshot END, electricity_previous = CASE WHEN $6::boolean THEN $7 ELSE electricity_previous END, electricity_current = CASE WHEN $8::boolean THEN $9 ELSE electricity_current END, electricity_usage = CASE WHEN $10::boolean THEN $11 ELSE electricity_usage END, electricity_unit_price = CASE WHEN $12::boolean THEN $13 ELSE electricity_unit_price END, electricity_amount = CASE WHEN $14::boolean THEN $15 ELSE electricity_amount END, water_previous = CASE WHEN $16::boolean THEN $17 ELSE water_previous END, water_current = CASE WHEN $18::boolean THEN $19 ELSE water_current END, water_usage = CASE WHEN $20::boolean THEN $21 ELSE water_usage END, water_unit_price = CASE WHEN $22::boolean THEN $23 ELSE water_unit_price END, water_amount = CASE WHEN $24::boolean THEN $25 ELSE water_amount END, wifi_fee = CASE WHEN $26::boolean THEN $27 ELSE wifi_fee END, trash_fee = CASE WHEN $28::boolean THEN $29 ELSE trash_fee END, shared_service_total = CASE WHEN $30::boolean THEN $31 ELSE shared_service_total END, total_invoice_amount = CASE WHEN $32::boolean THEN $33 ELSE total_invoice_amount END, finalized_by = CASE WHEN $34::boolean THEN $35 ELSE finalized_by END, finalized_at = CASE WHEN $36::boolean THEN $37 ELSE finalized_at END, cancelled_by = CASE WHEN $38::boolean THEN $39 ELSE cancelled_by END, cancelled_at = CASE WHEN $40::boolean THEN $41 ELSE cancelled_at END, cancel_reason = CASE WHEN $42::boolean THEN $43 ELSE cancel_reason END, updated_at = now() , status='FINALIZED'
      WHERE id=$1 AND status='DRAFT'
      RETURNING *`,
      [
        id,
        d.buildingNameSnapshot !== undefined,
        d.buildingNameSnapshot,
        d.roomNumberSnapshot !== undefined,
        d.roomNumberSnapshot,
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
        d.wifiFee !== undefined,
        d.wifiFee,
        d.trashFee !== undefined,
        d.trashFee,
        d.sharedServiceTotal !== undefined,
        d.sharedServiceTotal,
        d.totalInvoiceAmount !== undefined,
        d.totalInvoiceAmount,
        d.finalizedBy !== undefined,
        d.finalizedBy,
        d.finalizedAt !== undefined,
        d.finalizedAt,
        d.cancelledBy !== undefined,
        d.cancelledBy,
        d.cancelledAt !== undefined,
        d.cancelledAt,
        d.cancelReason !== undefined,
        d.cancelReason,
      ],
      s,
    );
  }
  async cancel(
    ...[id, adminId, reason, s]: Parameters<IMonthlyBillingRepository["cancel"]>
  ): ReturnType<IMonthlyBillingRepository["cancel"]> {
    return one<MonthlyBillingDocument>(
      `UPDATE monthly_billings
      SET status='CANCELLED',cancelled_by=$2,cancelled_at=now(),cancel_reason=$3,updated_at=now()
      WHERE id=$1 AND status='FINALIZED'
      RETURNING *`,
      [id, adminId, reason],
      s,
    );
  }
}
export { PostgresMonthlyBillingRepository as MonthlyBillingRepository };
