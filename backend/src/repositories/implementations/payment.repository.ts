import type {
  IPaymentRepository,
  PaymentInput,
  PaymentQuery,
} from "../interfaces/payment.repository.interface.js";
import type {
  Payment,
  PaymentStatus,
  PaymentView,
} from "../../models/payment.model.js";
import type { InvoiceDocument } from "../../models/invoice.model.js";
import type { TransactionContext } from "../../services/transaction-manager.js";
import { one, required, page, query } from "../../database/query.js";
const view = `SELECT p.*,i.billing_period,i.total_amount,COALESCE(a.paid,0) AS paid_amount,
  i.total_amount-COALESCE(a.paid,0) AS remaining_amount,i.status AS invoice_status,
  i.student_full_name_snapshot AS student_name,i.mssv_snapshot AS mssv,
  i.building_name_snapshot AS building_name,i.room_number_snapshot AS room_number,
  u.full_name AS processed_by_name,v.full_name AS voided_by_name
  FROM payments p JOIN invoices i ON i.id=p.invoice_id
  LEFT JOIN (SELECT invoice_id,SUM(amount) AS paid FROM payments WHERE status='CONFIRMED' GROUP BY invoice_id) a ON a.invoice_id=i.id
  LEFT JOIN users u ON u.id=p.processed_by LEFT JOIN users v ON v.id=p.voided_by`;
export class PostgresPaymentRepository implements IPaymentRepository {
  find(id: string, tx?: TransactionContext) {
    return one<Payment>(
      `SELECT * FROM payments WHERE id=$1${tx ? " FOR UPDATE" : ""}`,
      [id],
      tx,
    );
  }
  async lockInvoice(id: string, tx: TransactionContext) {
    // Separate statement after obtaining the lock: see cancellations committed while waiting.
    const invoice = await one<InvoiceDocument>(
      "SELECT * FROM invoices WHERE id=$1 FOR UPDATE",
      [id],
      tx,
    );
    if (!invoice) return null;
    const parent = await required<{ status: string }>(
      "SELECT status FROM monthly_billings WHERE id=$1",
      [invoice.monthlyBillingId],
      tx,
    );
    return { ...invoice, billingStatus: parent.status };
  }
  async confirmedTotal(id: string, tx: TransactionContext) {
    return (
      await required<{ total: number }>(
        "SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE invoice_id=$1 AND status='CONFIRMED'",
        [id],
        tx,
      )
    ).total;
  }
  async pending(id: string, tx: TransactionContext) {
    return !!(await one(
      "SELECT id FROM payments WHERE invoice_id=$1 AND status='PENDING'",
      [id],
      tx,
    ));
  }
  create(
    invoiceId: string,
    userId: string,
    d: PaymentInput,
    tx: TransactionContext,
  ) {
    return required<Payment>(
      `INSERT INTO payments(invoice_id,submitted_by,amount,method,reference_code,note) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [invoiceId, userId, d.amount, d.method, d.referenceCode, d.note],
      tx,
    );
  }
  transition(
    id: string,
    expected: PaymentStatus,
    next: PaymentStatus,
    actor: string,
    reason: string | undefined,
    tx: TransactionContext,
  ) {
    return one<Payment>(
      `UPDATE payments SET status=$3,updated_at=now(),
      processed_by=CASE WHEN $3 IN ('CONFIRMED','REJECTED') THEN $4::uuid ELSE processed_by END,
      processed_at=CASE WHEN $3 IN ('CONFIRMED','REJECTED') THEN now() ELSE processed_at END,
      reject_reason=CASE WHEN $3='REJECTED' THEN $5 ELSE reject_reason END,
      cancelled_at=CASE WHEN $3='CANCELLED' THEN now() ELSE cancelled_at END,
      cancel_reason=CASE WHEN $3='CANCELLED' THEN $5 ELSE cancel_reason END,
      voided_by=CASE WHEN $3='VOIDED' THEN $4::uuid ELSE voided_by END,
      voided_at=CASE WHEN $3='VOIDED' THEN now() ELSE voided_at END,
      void_reason=CASE WHEN $3='VOIDED' THEN $5 ELSE void_reason END
      WHERE id=$1 AND status=$2 RETURNING *`,
      [id, expected, next, actor, reason],
      tx,
    );
  }
  async updateInvoice(
    id: string,
    status: InvoiceDocument["status"],
    tx: TransactionContext,
  ) {
    await query(
      "UPDATE invoices SET status=$2,updated_at=now() WHERE id=$1",
      [id, status],
      tx,
    );
  }
  list(q: PaymentQuery, studentId?: string) {
    return page<PaymentView>(
      `${view} WHERE ($1::uuid IS NULL OR i.student_id=$1) AND ($2::text IS NULL OR p.status=$2) AND ($3::text IS NULL OR i.billing_period=$3) AND ($4::uuid IS NULL OR i.id=$4)`,
      [studentId, q.status, q.billingPeriod, q.invoiceId],
      q,
      "p.created_at DESC,p.id",
    );
  }
  detail(id: string, studentId?: string) {
    return one<PaymentView>(
      `${view} WHERE p.id=$1 AND ($2::uuid IS NULL OR i.student_id=$2)`,
      [id, studentId],
    );
  }
}
