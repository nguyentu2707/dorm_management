import {
  Ban,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  XCircle,
} from "lucide-react";
import type { StudentInvoice } from "../../types/api";
import {
  invoiceLabels,
  paymentLabels,
  type PaymentStatus,
} from "./payment.api";

const paymentTone: Record<PaymentStatus, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-700",
  CONFIRMED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  REJECTED: "border-red-200 bg-red-50 text-red-700",
  CANCELLED: "border-slate-200 bg-slate-100 text-slate-600",
  VOIDED: "border-violet-200 bg-violet-50 text-violet-700",
};
const invoiceTone: Record<StudentInvoice["status"], string> = {
  UNPAID: "border-amber-200 bg-amber-50 text-amber-700",
  PARTIALLY_PAID: "border-blue-200 bg-blue-50 text-blue-700",
  PAID: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CANCELLED: "border-slate-200 bg-slate-100 text-slate-600",
};

const icons = {
  PENDING: Clock3,
  CONFIRMED: CheckCircle2,
  REJECTED: XCircle,
  CANCELLED: Ban,
  VOIDED: Ban,
};

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const Icon = icons[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${paymentTone[status]}`}
    >
      <Icon size={13} aria-hidden="true" />
      {paymentLabels[status]}
    </span>
  );
}

export function InvoiceBadge({ status }: { status: StudentInvoice["status"] }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${invoiceTone[status]}`}
    >
      <CircleDollarSign size={13} aria-hidden="true" />
      {invoiceLabels[status]}
    </span>
  );
}

export const formatBillingPeriod = (period: string) => {
  const [year, month] = period.split("-");
  return month && year ? `Tháng ${month}/${year}` : period;
};
