import type { ClientSession } from "mongoose";
import type { EquipmentCategoryDocument } from "../../models/equipment-category.model.js";
export type EquipmentCategoryData = {
  name: string;
  unit: string;
  defaultLifespanMonths?: number;
};
export interface IEquipmentCategoryRepository {
  findAll(): Promise<EquipmentCategoryDocument[]>;
  findById(id: string): Promise<EquipmentCategoryDocument | null>;
  create(
    d: EquipmentCategoryData,
    s?: ClientSession,
  ): Promise<EquipmentCategoryDocument>;
  update(
    id: string,
    d: Partial<EquipmentCategoryData>,
    s?: ClientSession,
  ): Promise<EquipmentCategoryDocument | null>;
  deleteById(id: string, s?: ClientSession): Promise<void>;
}
