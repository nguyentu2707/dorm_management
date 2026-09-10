import type { TransactionContext } from "../../services/transaction-manager.js";
import type { BedDocument } from "../../models/bed.model.js";
export interface IBedRepository {
  findById(id: string, s?: TransactionContext): Promise<BedDocument | null>;
  findByRoomId(id: string, s?: TransactionContext): Promise<BedDocument[]>;
  createMany(
    id: string,
    count: number,
    s?: TransactionContext,
  ): Promise<BedDocument[]>;
  ensureCapacity(
    id: string,
    count: number,
    s?: TransactionContext,
  ): Promise<number>;
  countOccupiedByRoomId(id: string, s?: TransactionContext): Promise<number>;
  countEmptyByRoomId(id: string, s?: TransactionContext): Promise<number>;
  summarizeByRoomIds(
    ids: string[],
  ): Promise<Map<string, { total: number; occupied: number; empty: number }>>;
  occupyIfEmpty(id: string, s?: TransactionContext): Promise<boolean>;
  releaseIfOccupied(id: string, s?: TransactionContext): Promise<boolean>;
  deleteByRoomId(id: string, s?: TransactionContext): Promise<void>;
}
