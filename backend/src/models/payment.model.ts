export const PAYMENT_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "REJECTED",
  "CANCELLED",
  "VOIDED",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  method: "BANK_TRANSFER";
  status: PaymentStatus;
  referenceCode?: string;
  note?: string;
  submittedBy: string;
  createdAt: Date;
  updatedAt: Date;
  processedBy?: string;
  processedAt?: Date;
  rejectReason?: string;
  cancelledAt?: Date;
  cancelReason?: string;
  voidedBy?: string;
  voidedAt?: Date;
  voidReason?: string;
}
export interface PaymentView extends Payment {
  billingPeriod: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  invoiceStatus: string;
  studentName: string;
  mssv: string;
  buildingName: string;
  roomNumber: string;
  processedByName?: string;
  voidedByName?: string;
}
