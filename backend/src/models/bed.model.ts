import { Schema, model, type HydratedDocument, Types } from "mongoose";
export interface Bed {
  roomId: Types.ObjectId;
  bedNumber: string;
  status: "EMPTY" | "OCCUPIED";
  createdAt: Date;
  updatedAt: Date;
}
export type BedDocument = HydratedDocument<Bed>;
const schema = new Schema<Bed>(
  {
    roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true },
    bedNumber: { type: String, required: true },
    status: { type: String, enum: ["EMPTY", "OCCUPIED"], default: "EMPTY" },
  },
  { timestamps: true },
);
schema.index({ roomId: 1, bedNumber: 1 }, { unique: true });
export const BedModel = model<Bed>("Bed", schema);
