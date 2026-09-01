import type { ClientSession } from "mongoose";
import type { BedDocument } from "../../models/bed.model.js";
export interface IBedRepository {
  findById(id: string, s?: ClientSession): Promise<BedDocument | null>;
  findByRoomId(id: string, s?: ClientSession): Promise<BedDocument[]>;
  createMany(
    id: string,
    count: number,
    s?: ClientSession,
  ): Promise<BedDocument[]>;
  ensureCapacity(
    id: string,
    count: number,
    s?: ClientSession,
  ): Promise<number>;
  countOccupiedByRoomId(id: string, s?: ClientSession): Promise<number>;
  countEmptyByRoomId(id: string, s?: ClientSession): Promise<number>;
  summarizeByRoomIds(
    ids: string[],
  ): Promise<Map<string, { total: number; occupied: number; empty: number }>>;
  occupyIfEmpty(id: string, s?: ClientSession): Promise<boolean>;
  releaseIfOccupied(id: string, s?: ClientSession): Promise<boolean>;
  deleteByRoomId(id: string, s?: ClientSession): Promise<void>;
}
