import type {
  Payment,
  PaymentStatus,
  PaymentView,
} from "../../models/payment.model.js";
import type { InvoiceDocument } from "../../models/invoice.model.js";
import type { TransactionContext } from "../../services/transaction-manager.js";
import type { PaginatedResult } from "../../types/common.types.js";
export type PaymentInput = {
  amount: number;
  method: "BANK_TRANSFER";
  referenceCode?: string;
  note?: string;
};
export type PaymentQuery = {
  page: number;
  limit: number;
  status?: PaymentStatus;
  billingPeriod?: string;
  invoiceId?: string;
};
export interface IPaymentRepository {
  find(id: string, tx?: TransactionContext): Promise<Payment | null>;
  lockInvoice(
    id: string,
    tx: TransactionContext,
  ): Promise<(InvoiceDocument & { billingStatus: string }) | null>;
  confirmedTotal(invoiceId: string, tx: TransactionContext): Promise<number>;
  pending(invoiceId: string, tx: TransactionContext): Promise<boolean>;
  create(
    invoiceId: string,
    userId: string,
    input: PaymentInput,
    tx: TransactionContext,
  ): Promise<Payment>;
  transition(
    id: string,
    expected: PaymentStatus,
    next: PaymentStatus,
    actor: string,
    reason: string | undefined,
    tx: TransactionContext,
  ): Promise<Payment | null>;
  updateInvoice(
    id: string,
    status: InvoiceDocument["status"],
    tx: TransactionContext,
  ): Promise<void>;
  list(
    q: PaymentQuery,
    studentId?: string,
  ): Promise<PaginatedResult<PaymentView>>;
  detail(id: string, studentId?: string): Promise<PaymentView | null>;
}
