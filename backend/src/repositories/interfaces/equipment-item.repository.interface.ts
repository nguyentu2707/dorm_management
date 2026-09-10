import type { TransactionContext } from "../../services/transaction-manager.js";
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
export type EquipmentListQuery = {
  page: number;
  limit: number;
  search?: string;
  categoryId?: string;
  roomId?: string;
  buildingId?: string;
  condition?: EquipmentCondition;
};
export type AdminEquipmentRecord = Record<string, unknown>;
export interface IEquipmentItemRepository {
  findById(id: string): Promise<EquipmentItemDocument | null>;
  findBySerialNumber(serial: string): Promise<EquipmentItemDocument | null>;
  findByRoomId(
    id: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<EquipmentItemDocument>>;
  findAll(
    q: EquipmentListQuery,
  ): Promise<PaginatedResult<AdminEquipmentRecord>>;
  countByCategoryId(id: string): Promise<number>;
  countByRoomId(id: string): Promise<number>;
  create(
    d: EquipmentItemData,
    s?: TransactionContext,
  ): Promise<EquipmentItemDocument>;
  update(
    id: string,
    d: Partial<Omit<EquipmentItemData, "roomId">>,
    s?: TransactionContext,
  ): Promise<EquipmentItemDocument | null>;
  updateCondition(
    id: string,
    c: EquipmentCondition,
    s?: TransactionContext,
  ): Promise<EquipmentItemDocument | null>;
  deleteById(id: string, s?: TransactionContext): Promise<void>;
}
