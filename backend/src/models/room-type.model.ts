import { Schema, model, type HydratedDocument } from "mongoose";
export interface RoomType {
  name: string;
  capacity: number;
  pricePerMonth: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}
export type RoomTypeDocument = HydratedDocument<RoomType>;
const schema = new Schema<RoomType>(
  {
    name: { type: String, required: true, trim: true },
    capacity: { type: Number, required: true, min: 1 },
    pricePerMonth: { type: Number, required: true, min: 0 },
    description: String,
  },
  { timestamps: true },
);
export const RoomTypeModel = model<RoomType>("RoomType", schema);
