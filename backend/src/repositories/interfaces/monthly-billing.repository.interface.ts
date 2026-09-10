import type { TransactionContext } from "../../services/transaction-manager.js";
import type { MonthlyBillingDocument } from "../../models/monthly-billing.model.js";
import type { PaginatedResult } from "../../types/common.types.js";

export type MonthlyBillingListQuery = {
  page: number;
  limit: number;
  billingPeriod?: string;
  buildingId?: string;
  roomId?: string;
  status?: "DRAFT" | "FINALIZED" | "CANCELLED";
};

export interface IMonthlyBillingRepository {
  findById(
    id: string,
    session?: TransactionContext,
  ): Promise<MonthlyBillingDocument | null>;
  findByRoomAndPeriod(
    roomId: string,
    billingPeriod: string,
    session?: TransactionContext,
  ): Promise<MonthlyBillingDocument | null>;
  findAll(
    query: MonthlyBillingListQuery,
  ): Promise<PaginatedResult<Record<string, unknown>>>;
  create(
    data: Record<string, unknown>,
    session: TransactionContext,
  ): Promise<MonthlyBillingDocument>;
  upsertDraft(
    roomId: string,
    billingPeriod: string,
    data: Record<string, unknown>,
  ): Promise<MonthlyBillingDocument | null>;
  finalizeDraft(
    id: string,
    data: Record<string, unknown>,
    session: TransactionContext,
  ): Promise<MonthlyBillingDocument | null>;
  cancel(
    id: string,
    adminId: string,
    reason: string | undefined,
    session: TransactionContext,
  ): Promise<MonthlyBillingDocument | null>;
}
