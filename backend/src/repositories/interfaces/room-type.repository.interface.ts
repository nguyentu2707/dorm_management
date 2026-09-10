import type { TransactionContext } from "../../services/transaction-manager.js";
import type { RoomTypeDocument } from "../../models/room-type.model.js";
export type RoomTypeData = {
  name: string;
  capacity: number;
  pricePerMonth: number;
  description?: string;
};
export interface IRoomTypeRepository {
  findAll(): Promise<RoomTypeDocument[]>;
  findById(
    id: string,
    session?: TransactionContext,
  ): Promise<RoomTypeDocument | null>;
  findByIdForUpdate(
    id: string,
    session: TransactionContext,
  ): Promise<RoomTypeDocument | null>;
  create(
    data: RoomTypeData,
    session?: TransactionContext,
  ): Promise<RoomTypeDocument>;
  update(
    id: string,
    data: Partial<RoomTypeData>,
    session?: TransactionContext,
  ): Promise<RoomTypeDocument | null>;
  deleteById(id: string, session?: TransactionContext): Promise<void>;
}
