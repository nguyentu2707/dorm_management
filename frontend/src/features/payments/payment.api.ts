import { apiClient, dataOf } from "../../services/api-client";
import type { Paginated, StudentInvoice } from "../../types/api";
export type PaymentStatus =
  "PENDING" | "CONFIRMED" | "REJECTED" | "CANCELLED" | "VOIDED";
export interface Payment {
  id: string;
  amount: number;
  method: "BANK_TRANSFER";
  status: PaymentStatus;
  referenceCode?: string;
  note?: string;
  invoice: {
    id: string;
    billingPeriod: string;
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    status: StudentInvoice["status"];
  };
  student: { fullName: string; mssv: string };
  room: { buildingName: string; roomNumber: string };
  submittedAt: string;
  processedAt?: string;
  processedBy?: { id: string; fullName: string };
  rejectReason?: string;
  cancelReason?: string;
  cancelledAt?: string;
  voidReason?: string;
  voidedAt?: string;
  voidedBy?: { id: string; fullName: string };
}
export const paymentLabels: Record<PaymentStatus, string> = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  REJECTED: "Bị từ chối",
  CANCELLED: "Đã hủy",
  VOIDED: "Đã vô hiệu hóa",
};
export const invoiceLabels: Record<StudentInvoice["status"], string> = {
  UNPAID: "Chưa thanh toán",
  PARTIALLY_PAID: "Thanh toán một phần",
  PAID: "Đã thanh toán",
  CANCELLED: "Đã hủy",
};
export const paymentApi = {
  list: (admin: boolean, params: Record<string, string | number | undefined>) =>
    dataOf<Paginated<Payment>>(
      apiClient.get(admin ? "/admin/payments" : "/student/payments/me", {
        params,
      }),
    ),
  get: (id: string) => dataOf<Payment>(apiClient.get(`/admin/payments/${id}`)),
  submit: (
    invoiceId: string,
    input: { amount: number; referenceCode?: string; note?: string },
  ) =>
    dataOf<Payment>(
      apiClient.post(`/student/invoices/${invoiceId}/payments`, {
        ...input,
        method: "BANK_TRANSFER",
      }),
    ),
  cancel: (id: string) =>
    dataOf<Payment>(apiClient.patch(`/student/payments/${id}/cancel`, {})),
  process: (
    id: string,
    action: "confirm" | "reject" | "void",
    reason?: string,
  ) =>
    dataOf<Payment>(
      apiClient.patch(
        `/admin/payments/${id}/${action}`,
        reason ? { reason } : {},
      ),
    ),
};
