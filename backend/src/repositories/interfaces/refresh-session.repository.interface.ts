import type { RefreshSessionDocument } from "../../models/refresh-session.model.js";
import type { TransactionContext } from "../../services/transaction-manager.js";

export type CreateRefreshSessionData = Pick<
  RefreshSessionDocument,
  "id" | "userId" | "tokenHash" | "expiresAt"
> & { userAgent?: string };

export interface IRefreshSessionRepository {
  create(
    data: CreateRefreshSessionData,
    tx?: TransactionContext,
  ): Promise<RefreshSessionDocument>;
  findByIdForUpdate(
    id: string,
    tx: TransactionContext,
  ): Promise<RefreshSessionDocument | null>;
  revokeIfActive(
    id: string,
    usedAt: Date,
    tx?: TransactionContext,
  ): Promise<boolean>;
  revokeAllByUserId(
    userId: string,
    tx?: TransactionContext,
  ): Promise<number>;
  deleteExpiredOrOldRevoked(before: Date): Promise<number>;
}
