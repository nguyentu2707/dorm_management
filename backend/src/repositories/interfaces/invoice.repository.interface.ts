import type { TransactionContext } from "../../services/transaction-manager.js";
import type { InvoiceDocument } from "../../models/invoice.model.js";
import type { InvoiceItemDocument } from "../../models/invoice-item.model.js";
import type { PaginatedResult } from "../../types/common.types.js";

export type InvoiceListQuery = {
  page: number;
  limit: number;
  billingPeriod?: string;
};

export interface IInvoiceRepository {
  createMany(
    data: Record<string, unknown>[],
    session: TransactionContext,
  ): Promise<InvoiceDocument[]>;
  createItems(
    data: Record<string, unknown>[],
    session: TransactionContext,
  ): Promise<InvoiceItemDocument[]>;
  findByStudent(
    studentId: string,
    query: InvoiceListQuery,
  ): Promise<PaginatedResult<InvoiceDocument>>;
  findByIdForStudent(
    id: string,
    studentId: string,
  ): Promise<InvoiceDocument | null>;
  findByMonthlyBilling(monthlyBillingId: string): Promise<InvoiceDocument[]>;
  findItems(invoiceId: string): Promise<InvoiceItemDocument[]>;
  lockAndHasConfirmedPayments(
    monthlyBillingId: string,
    session: TransactionContext,
  ): Promise<boolean>;
  cancelByMonthlyBilling(
    monthlyBillingId: string,
    session: TransactionContext,
  ): Promise<number>;
}
