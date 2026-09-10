export const INVOICE_STATUSES = [
  "UNPAID",
  "PARTIALLY_PAID",
  "PAID",
  "CANCELLED",
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export interface Invoice {
  monthlyBillingId: string;
  studentId: string;
  contractId: string;
  billingPeriod: string;
  status: InvoiceStatus;
  buildingNameSnapshot: string;
  roomNumberSnapshot: string;
  studentFullNameSnapshot: string;
  mssvSnapshot: string;
  residentDays: number;
  daysInMonth: number;
  roomMonthlyPrice: number;
  roomFee: number;
  electricityShare: number;
  waterShare: number;
  wifiShare: number;
  trashShare: number;
  totalAmount: number;
  paidAmount?: number;
  pendingAmount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export type InvoiceDocument = Invoice & { id: string };
