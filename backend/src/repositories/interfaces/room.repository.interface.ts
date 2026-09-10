import type { TransactionContext } from "../../services/transaction-manager.js";
import type { RoomDocument, RoomStatus } from "../../models/room.model.js";
import type { PaginatedResult } from "../../types/common.types.js";
export type RoomData = {
  buildingId: string;
  roomTypeId: string;
  roomNumber: string;
  floor: number;
  status?: RoomStatus;
};
export type RoomListQuery = {
  page: number;
  limit: number;
  search?: string;
  status?: RoomStatus;
  roomTypeId?: string;
  floor?: number;
};
export interface IRoomRepository {
  lockUtilityLedger(id: string, s: TransactionContext): Promise<void>;
  findById(id: string, s?: TransactionContext): Promise<RoomDocument | null>;
  findByBuildingId(
    id: string,
    q: RoomListQuery,
  ): Promise<PaginatedResult<RoomDocument>>;
  findByRoomNumberAndBuildingId(
    n: string,
    b: string,
  ): Promise<RoomDocument | null>;
  countByBuildingId(id: string): Promise<number>;
  countByRoomTypeId(id: string, s?: TransactionContext): Promise<number>;
  create(d: RoomData, s?: TransactionContext): Promise<RoomDocument>;
  update(
    id: string,
    d: Partial<Omit<RoomData, "buildingId">>,
    s?: TransactionContext,
  ): Promise<RoomDocument | null>;
  updateStatus(
    id: string,
    status: RoomStatus,
    s?: TransactionContext,
  ): Promise<RoomDocument | null>;
  deleteById(id: string, s?: TransactionContext): Promise<void>;
}
