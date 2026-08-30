import type { ClientSession } from "mongoose";
import type {
  EquipmentCondition,
  EquipmentItemDocument,
} from "../../models/equipment-item.model.js";
import type { PaginatedResult } from "../../types/common.types.js";
export type EquipmentItemData = {
  categoryId: string;
  roomId: string;
  serialNumber?: string;
  condition?: EquipmentCondition;
  purchaseDate?: Date;
  purchasePrice?: number;
};
export interface IEquipmentItemRepository {
  findById(id: string): Promise<EquipmentItemDocument | null>;
  findByRoomId(
    id: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<EquipmentItemDocument>>;
  countByCategoryId(id: string): Promise<number>;
  countByRoomId(id: string): Promise<number>;
  create(
    d: EquipmentItemData,
    s?: ClientSession,
  ): Promise<EquipmentItemDocument>;
  update(
    id: string,
    d: Partial<Omit<EquipmentItemData, "roomId">>,
    s?: ClientSession,
  ): Promise<EquipmentItemDocument | null>;
  updateCondition(
    id: string,
    c: EquipmentCondition,
    s?: ClientSession,
  ): Promise<EquipmentItemDocument | null>;
  deleteById(id: string, s?: ClientSession): Promise<void>;
}
