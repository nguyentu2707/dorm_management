import type { TransactionContext } from "../../services/transaction-manager.js";
import type { UtilityReadingDocument } from "../../models/utility-reading.model.js";
import type { PaginatedResult } from "../../types/common.types.js";

export type UtilityListQuery = {
  page: number;
  limit: number;
  billingPeriod?: string;
  buildingId?: string;
  roomId?: string;
};

export interface IUtilityReadingRepository {
  findById(
    id: string,
    session?: TransactionContext,
  ): Promise<UtilityReadingDocument | null>;
  findByRoomAndPeriod(
    roomId: string,
    period: string,
    session?: TransactionContext,
  ): Promise<UtilityReadingDocument | null>;
  findLatestByRoom(
    roomId: string,
    session?: TransactionContext,
  ): Promise<UtilityReadingDocument | null>;
  findPreviousBeforePeriod(
    roomId: string,
    period: string,
    session?: TransactionContext,
  ): Promise<UtilityReadingDocument | null>;
  findByRoom(roomId: string): Promise<UtilityReadingDocument[]>;
  findAll(
    query: UtilityListQuery,
  ): Promise<PaginatedResult<Record<string, unknown>>>;
  create(
    data: Record<string, unknown>,
    session?: TransactionContext,
  ): Promise<UtilityReadingDocument>;
  update(
    id: string,
    data: Record<string, unknown>,
    session?: TransactionContext,
  ): Promise<UtilityReadingDocument | null>;
}
