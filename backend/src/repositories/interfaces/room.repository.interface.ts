import type { ClientSession } from "mongoose";
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
  findById(id: string, s?: ClientSession): Promise<RoomDocument | null>;
  findByBuildingId(
    id: string,
    q: RoomListQuery,
  ): Promise<PaginatedResult<RoomDocument>>;
  findByRoomNumberAndBuildingId(
    n: string,
    b: string,
  ): Promise<RoomDocument | null>;
  countByBuildingId(id: string): Promise<number>;
  countByRoomTypeId(id: string): Promise<number>;
  create(d: RoomData, s?: ClientSession): Promise<RoomDocument>;
  update(
    id: string,
    d: Partial<Omit<RoomData, "buildingId">>,
    s?: ClientSession,
  ): Promise<RoomDocument | null>;
  updateStatus(
    id: string,
    status: RoomStatus,
    s?: ClientSession,
  ): Promise<RoomDocument | null>;
  deleteById(id: string, s?: ClientSession): Promise<void>;
}
