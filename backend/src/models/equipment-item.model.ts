export const EQUIPMENT_CONDITIONS = [
  "NEW",
  "GOOD",
  "DAMAGED",
  "BROKEN",
  "LOST",
] as const;
export type EquipmentCondition = (typeof EQUIPMENT_CONDITIONS)[number];
export interface EquipmentItem {
  categoryId: string;
  roomId: string;
  serialNumber?: string;
  condition: EquipmentCondition;
  purchaseDate?: Date;
  purchasePrice?: number;
  createdAt: Date;
  updatedAt: Date;
}
export type EquipmentItemDocument = EquipmentItem & { id: string };
