import { Schema, model, type HydratedDocument } from "mongoose";
export interface Building {
  name: string;
  address?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}
export type BuildingDocument = HydratedDocument<Building>;
const schema = new Schema<Building>(
  {
    name: { type: String, required: true, trim: true },
    address: String,
    description: String,
  },
  { timestamps: true },
);
export const BuildingModel = model<Building>("Building", schema);
