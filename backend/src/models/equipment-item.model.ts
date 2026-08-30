import { Schema, model, type HydratedDocument, Types } from "mongoose";
export const EQUIPMENT_CONDITIONS = [
  "NEW",
  "GOOD",
  "DAMAGED",
  "BROKEN",
  "LOST",
] as const;
export type EquipmentCondition = (typeof EQUIPMENT_CONDITIONS)[number];
export interface EquipmentItem {
  categoryId: Types.ObjectId;
  roomId: Types.ObjectId;
  serialNumber?: string;
  condition: EquipmentCondition;
  purchaseDate?: Date;
  purchasePrice?: number;
  createdAt: Date;
  updatedAt: Date;
}
export type EquipmentItemDocument = HydratedDocument<EquipmentItem>;
const schema = new Schema<EquipmentItem>(
  {
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "EquipmentCategory",
      required: true,
    },
    roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true },
    serialNumber: { type: String, trim: true },
    condition: { type: String, enum: EQUIPMENT_CONDITIONS, default: "NEW" },
    purchaseDate: Date,
    purchasePrice: { type: Number, min: 0 },
  },
  { timestamps: true },
);
schema.index({ serialNumber: 1 }, { unique: true, sparse: true });
export const EquipmentItemModel = model<EquipmentItem>("EquipmentItem", schema);
