import type {
  DashboardSummaryProjection,
  DashboardTrendsProjection,
  IDashboardRepository,
} from "../interfaces/dashboard.repository.interface.js";
import { required, rows } from "../../database/query.js";

const BUSINESS_TIME_ZONE = "Asia/Ho_Chi_Minh";

export class PostgresDashboardRepository implements IDashboardRepository {
  async summary(): Promise<DashboardSummaryProjection> {
    const [facility, residence, operations, finance, occupancyByBuilding] =
      await Promise.all([
        required<DashboardSummaryProjection["facility"]>(`
          SELECT
            (SELECT count(*) FROM buildings) AS total_buildings,
            (SELECT count(*) FROM buildings WHERE status='ACTIVE') AS active_buildings,
            (SELECT count(*) FROM rooms) AS total_rooms,
            count(bed.id) AS total_beds,
            count(bed.id) FILTER (
              WHERE building.status='ACTIVE' AND room.status IN ('AVAILABLE','FULL')
            ) AS total_usable_beds,
            count(bed.id) FILTER (
              WHERE building.status='ACTIVE' AND room.status IN ('AVAILABLE','FULL')
                AND bed.status='OCCUPIED'
            ) AS occupied_beds,
            count(bed.id) FILTER (
              WHERE building.status='ACTIVE' AND room.status IN ('AVAILABLE','FULL')
                AND bed.status='EMPTY'
            ) AS empty_beds,
            (SELECT count(*)
             FROM contracts active_contract
             JOIN beds active_bed ON active_bed.id=active_contract.bed_id
             JOIN rooms active_room ON active_room.id=active_bed.room_id
             JOIN buildings active_building ON active_building.id=active_room.building_id
             WHERE active_contract.status='ACTIVE'
               AND active_building.status='ACTIVE'
               AND active_room.status IN ('AVAILABLE','FULL')) AS active_resident_beds
          FROM beds bed
          JOIN rooms room ON room.id=bed.room_id
          JOIN buildings building ON building.id=room.building_id
        `),
        required<
          DashboardSummaryProjection["residence"] &
            DashboardSummaryProjection["expiringContracts"]
        >(`
          SELECT
            (SELECT count(*) FROM contracts WHERE status='ACTIVE') AS active_contracts,
            (SELECT count(*) FROM contracts WHERE status='PENDING') AS pending_contracts,
            (SELECT count(*) FROM room_change_requests WHERE status='PENDING') AS pending_room_changes,
            (SELECT count(*) FROM checkout_requests WHERE status='PENDING') AS pending_checkouts,
            count(*) FILTER (
              WHERE status='ACTIVE'
                AND end_date >= date_trunc('day', now() AT TIME ZONE '${BUSINESS_TIME_ZONE}') AT TIME ZONE '${BUSINESS_TIME_ZONE}'
                AND end_date < (date_trunc('day', now() AT TIME ZONE '${BUSINESS_TIME_ZONE}') + interval '8 days') AT TIME ZONE '${BUSINESS_TIME_ZONE}'
            ) AS within7_days,
            count(*) FILTER (
              WHERE status='ACTIVE'
                AND end_date >= date_trunc('day', now() AT TIME ZONE '${BUSINESS_TIME_ZONE}') AT TIME ZONE '${BUSINESS_TIME_ZONE}'
                AND end_date < (date_trunc('day', now() AT TIME ZONE '${BUSINESS_TIME_ZONE}') + interval '31 days') AT TIME ZONE '${BUSINESS_TIME_ZONE}'
            ) AS within30_days
          FROM contracts
        `),
        required<DashboardSummaryProjection["operations"]>(`
          SELECT
            (SELECT count(*) FROM maintenance_requests WHERE status='PENDING') AS pending_maintenance,
            (SELECT count(*) FROM maintenance_requests WHERE status='IN_PROGRESS') AS in_progress_maintenance,
            (SELECT count(*) FROM staff WHERE status='ACTIVE') AS active_staff
        `),
        required<DashboardSummaryProjection["finance"]>(`
          WITH confirmed_by_invoice AS (
            SELECT invoice_id, sum(amount) AS confirmed_amount
            FROM payments
            WHERE status='CONFIRMED'
            GROUP BY invoice_id
          ), invoice_metrics AS (
            SELECT
              count(*) FILTER (WHERE invoice.status='UNPAID') AS unpaid_invoices,
              count(*) FILTER (WHERE invoice.status='PARTIALLY_PAID') AS partially_paid_invoices,
              count(*) FILTER (WHERE invoice.status='PAID') AS paid_invoices,
              coalesce(sum(invoice.total_amount),0) AS billed_amount,
              coalesce(sum(invoice.total_amount - coalesce(payment.confirmed_amount,0)),0) AS outstanding_amount,
              count(*) FILTER (
                WHERE invoice.total_amount - coalesce(payment.confirmed_amount,0) < 0
              ) AS overpaid_invoices
            FROM invoices invoice
            LEFT JOIN confirmed_by_invoice payment ON payment.invoice_id=invoice.id
            WHERE invoice.status<>'CANCELLED'
          ), payment_metrics AS (
            SELECT
              coalesce(sum(amount),0) AS confirmed_revenue_all_time,
              coalesce(sum(amount) FILTER (
                WHERE processed_at >= date_trunc('month', now() AT TIME ZONE '${BUSINESS_TIME_ZONE}') AT TIME ZONE '${BUSINESS_TIME_ZONE}'
                  AND processed_at < (date_trunc('month', now() AT TIME ZONE '${BUSINESS_TIME_ZONE}') + interval '1 month') AT TIME ZONE '${BUSINESS_TIME_ZONE}'
              ),0) AS confirmed_revenue_this_month
            FROM payments
            WHERE status='CONFIRMED'
          )
          SELECT * FROM invoice_metrics CROSS JOIN payment_metrics
        `),
        rows<DashboardSummaryProjection["occupancyByBuilding"][number]>(`
          SELECT
            building.id AS building_id,
            building.name AS building_name,
            building.allowed_gender,
            count(bed.id) AS total_beds,
            count(bed.id) FILTER (
              WHERE building.status='ACTIVE' AND room.status IN ('AVAILABLE','FULL')
            ) AS total_usable_beds,
            count(bed.id) FILTER (
              WHERE building.status='ACTIVE' AND room.status IN ('AVAILABLE','FULL')
                AND bed.status='OCCUPIED'
            ) AS occupied_beds,
            count(bed.id) FILTER (
              WHERE building.status='ACTIVE' AND room.status IN ('AVAILABLE','FULL')
                AND bed.status='EMPTY'
            ) AS empty_beds
          FROM buildings building
          LEFT JOIN rooms room ON room.building_id=building.id
          LEFT JOIN beds bed ON bed.room_id=room.id
          GROUP BY building.id, building.name, building.allowed_gender
          ORDER BY building.name, building.id
        `),
      ]);

    return {
      facility,
      residence: {
        activeContracts: residence.activeContracts,
        pendingContracts: residence.pendingContracts,
        pendingRoomChanges: residence.pendingRoomChanges,
        pendingCheckouts: residence.pendingCheckouts,
      },
      operations,
      finance,
      expiringContracts: {
        within7Days: residence.within7Days,
        within30Days: residence.within30Days,
      },
      occupancyByBuilding,
    };
  }

  async trends(months: number): Promise<DashboardTrendsProjection> {
    const [revenue, utilities, maintenanceByStatus] = await Promise.all([
      rows<DashboardTrendsProjection["revenue"][number]>(
        `SELECT
           to_char(processed_at AT TIME ZONE '${BUSINESS_TIME_ZONE}', 'YYYY-MM') AS period,
           sum(amount) AS amount
         FROM payments
         WHERE status='CONFIRMED'
           AND processed_at >= (
             date_trunc('month', now() AT TIME ZONE '${BUSINESS_TIME_ZONE}') - ($1::int - 1) * interval '1 month'
           ) AT TIME ZONE '${BUSINESS_TIME_ZONE}'
         GROUP BY period ORDER BY period`,
        [months],
      ),
      rows<DashboardTrendsProjection["utilities"][number]>(
        `SELECT billing_period AS period,
           sum(electricity_usage) AS electricity_usage,
           sum(water_usage) AS water_usage
         FROM utility_readings
         WHERE billing_period >= to_char(
             date_trunc('month', now() AT TIME ZONE '${BUSINESS_TIME_ZONE}') - ($1::int - 1) * interval '1 month', 'YYYY-MM'
           )
           AND billing_period <= to_char(now() AT TIME ZONE '${BUSINESS_TIME_ZONE}', 'YYYY-MM')
         GROUP BY billing_period ORDER BY billing_period`,
        [months],
      ),
      rows<DashboardTrendsProjection["maintenanceByStatus"][number]>(`
        SELECT status,count(*) FROM maintenance_requests GROUP BY status ORDER BY status
      `),
    ]);
    return { revenue, utilities, maintenanceByStatus };
  }
}
