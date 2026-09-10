import type { PaymentView } from "../models/payment.model.js";
export const mapPayment = (p: PaymentView) => ({
  id: p.id,
  amount: p.amount,
  method: p.method,
  status: p.status,
  referenceCode: p.referenceCode,
  note: p.note,
  invoice: {
    id: p.invoiceId,
    billingPeriod: p.billingPeriod,
    totalAmount: p.totalAmount,
    paidAmount: p.paidAmount,
    remainingAmount: p.remainingAmount,
    status: p.invoiceStatus,
  },
  student: { fullName: p.studentName, mssv: p.mssv },
  room: { buildingName: p.buildingName, roomNumber: p.roomNumber },
  submittedAt: p.createdAt,
  processedAt: p.processedAt,
  processedBy: p.processedBy
    ? { id: p.processedBy, fullName: p.processedByName }
    : undefined,
  rejectReason: p.rejectReason,
  cancelledAt: p.cancelledAt,
  cancelReason: p.cancelReason,
  voidedAt: p.voidedAt,
  voidReason: p.voidReason,
  voidedBy: p.voidedBy
    ? { id: p.voidedBy, fullName: p.voidedByName }
    : undefined,
});
