import { Schema, model, type HydratedDocument } from "mongoose";
export interface EquipmentCategory {
  name: string;
  unit: string;
  defaultLifespanMonths?: number;
  createdAt: Date;
  updatedAt: Date;
}
export type EquipmentCategoryDocument = HydratedDocument<EquipmentCategory>;
const schema = new Schema<EquipmentCategory>(
  {
    name: { type: String, required: true, trim: true },
    unit: { type: String, required: true, trim: true },
    defaultLifespanMonths: { type: Number, min: 1 },
  },
  { timestamps: true },
);
export const EquipmentCategoryModel = model<EquipmentCategory>(
  "EquipmentCategory",
  schema,
);
