import type { ClientSession } from "mongoose";
import type { RoomTypeDocument } from "../../models/room-type.model.js";
export type RoomTypeData = {
  name: string;
  capacity: number;
  pricePerMonth: number;
  description?: string;
};
export interface IRoomTypeRepository {
  findAll(): Promise<RoomTypeDocument[]>;
  findById(id: string): Promise<RoomTypeDocument | null>;
  create(
    data: RoomTypeData,
    session?: ClientSession,
  ): Promise<RoomTypeDocument>;
  update(
    id: string,
    data: Partial<RoomTypeData>,
    session?: ClientSession,
  ): Promise<RoomTypeDocument | null>;
  deleteById(id: string, session?: ClientSession): Promise<void>;
}
