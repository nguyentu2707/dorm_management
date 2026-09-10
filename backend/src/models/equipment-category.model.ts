export interface EquipmentCategory {
  name: string;
  unit: string;
  defaultLifespanMonths?: number;
  createdAt: Date;
  updatedAt: Date;
}
export type EquipmentCategoryDocument = EquipmentCategory & { id: string };
