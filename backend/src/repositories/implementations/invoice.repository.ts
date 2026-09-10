import type { IInvoiceRepository } from "../interfaces/invoice.repository.interface.js";
import type { InvoiceDocument } from "../../models/invoice.model.js";
import type { InvoiceItemDocument } from "../../models/invoice-item.model.js";
const financialView = `SELECT i.*,COALESCE(p.paid,0) AS paid_amount,COALESCE(p.pending,0) AS pending_amount FROM invoices i
  LEFT JOIN (SELECT invoice_id,SUM(amount) FILTER (WHERE status='CONFIRMED') AS paid,
  SUM(amount) FILTER (WHERE status='PENDING') AS pending FROM payments GROUP BY invoice_id) p ON p.invoice_id=i.id`;
import {
  query,
  rows,
  one,
  required,
  count,
  page,
  contains,
} from "../../database/query.js";
export class PostgresInvoiceRepository implements IInvoiceRepository {
  async createMany(
    ...[data, s]: Parameters<IInvoiceRepository["createMany"]>
  ): ReturnType<IInvoiceRepository["createMany"]> {
    const result: InvoiceDocument[] = [];
    for (const d of data)
      result.push(
        await required<InvoiceDocument>(
          `INSERT INTO invoices (monthly_billing_id, student_id, contract_id, billing_period, status, building_name_snapshot, room_number_snapshot, student_full_name_snapshot, mssv_snapshot, resident_days, days_in_month, room_monthly_price, room_fee, electricity_share, water_share, wifi_share, trash_share, total_amount)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
          [
            d.monthlyBillingId,
            d.studentId,
            d.contractId,
            d.billingPeriod,
            d.status,
            d.buildingNameSnapshot,
            d.roomNumberSnapshot,
            d.studentFullNameSnapshot,
            d.mssvSnapshot,
            d.residentDays,
            d.daysInMonth,
            d.roomMonthlyPrice,
            d.roomFee,
            d.electricityShare,
            d.waterShare,
            d.wifiShare,
            d.trashShare,
            d.totalAmount,
          ],
          s,
        ),
      );
    return result;
  }
  async createItems(
    ...[data, s]: Parameters<IInvoiceRepository["createItems"]>
  ): ReturnType<IInvoiceRepository["createItems"]> {
    const result: InvoiceItemDocument[] = [];
    for (const d of data)
      result.push(
        await required<InvoiceItemDocument>(
          `INSERT INTO invoice_items (invoice_id, type, description, amount, calculation_note) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [d.invoiceId, d.type, d.description, d.amount, d.calculationNote],
          s,
        ),
      );
    return result;
  }
  async findByStudent(
    ...[studentId, q]: Parameters<IInvoiceRepository["findByStudent"]>
  ): ReturnType<IInvoiceRepository["findByStudent"]> {
    return page<InvoiceDocument>(
      `${financialView} WHERE i.student_id=$1 AND ($2::text IS NULL OR i.billing_period=$2)`,
      [studentId, q.billingPeriod],
      q,
      "i.billing_period DESC,i.created_at DESC,i.id",
    );
  }
  async findByIdForStudent(
    ...[id, studentId]: Parameters<IInvoiceRepository["findByIdForStudent"]>
  ): ReturnType<IInvoiceRepository["findByIdForStudent"]> {
    return one<InvoiceDocument>(
      `${financialView} WHERE i.id=$1 AND i.student_id=$2`,
      [id, studentId],
      undefined,
    );
  }
  async findByMonthlyBilling(
    ...[id]: Parameters<IInvoiceRepository["findByMonthlyBilling"]>
  ): ReturnType<IInvoiceRepository["findByMonthlyBilling"]> {
    return rows<InvoiceDocument>(
      `${financialView} WHERE i.monthly_billing_id=$1 ORDER BY i.student_full_name_snapshot,i.id`,
      [id],
      undefined,
    );
  }
  async findItems(
    ...[invoiceId]: Parameters<IInvoiceRepository["findItems"]>
  ): ReturnType<IInvoiceRepository["findItems"]> {
    return rows<InvoiceItemDocument>(
      `SELECT *
      FROM invoice_items
      WHERE invoice_id=$1
      ORDER BY created_at,CASE type WHEN 'ROOM_FEE' THEN 1 WHEN 'ELECTRICITY' THEN 2 WHEN 'WATER' THEN 3 WHEN 'WIFI' THEN 4 ELSE 5 END,id`,
      [invoiceId],
    );
  }
  async lockAndHasConfirmedPayments(
    ...[id, s]: Parameters<IInvoiceRepository["lockAndHasConfirmedPayments"]>
  ): ReturnType<IInvoiceRepository["lockAndHasConfirmedPayments"]> {
    // Parent is locked by MonthlyBillingService. Lock ALL children before checking payments.
    await rows(
      "SELECT id FROM invoices WHERE monthly_billing_id=$1 ORDER BY id FOR UPDATE",
      [id],
      s,
    );
    const confirmed = await one(
      `SELECT p.id FROM payments p JOIN invoices i ON i.id=p.invoice_id
      WHERE i.monthly_billing_id=$1 AND p.status='CONFIRMED' LIMIT 1`,
      [id],
      s,
    );
    return !!confirmed;
  }
  async cancelByMonthlyBilling(
    ...[id, s]: Parameters<IInvoiceRepository["cancelByMonthlyBilling"]>
  ): ReturnType<IInvoiceRepository["cancelByMonthlyBilling"]> {
    await query(
      `UPDATE payments p SET status='CANCELLED',cancelled_at=now(),cancel_reason='Kỳ hóa đơn đã hủy',updated_at=now()
      FROM invoices i WHERE i.id=p.invoice_id AND i.monthly_billing_id=$1 AND p.status='PENDING'`,
      [id],
      s,
    );
    return (
      (
        await query(
          `UPDATE invoices SET status='CANCELLED',updated_at=now() WHERE monthly_billing_id=$1 AND status='UNPAID'`,
          [id],
          s,
        )
      ).rowCount ?? 0
    );
  }
}
export { PostgresInvoiceRepository as InvoiceRepository };
