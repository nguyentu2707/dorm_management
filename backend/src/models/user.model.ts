import { Schema, model, type HydratedDocument } from "mongoose";
import type { Role } from "../types/common.types.js";
export interface User {
  username: string;
  passwordHash: string;
  role: Role;
  fullName: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  status: "ACTIVE" | "LOCKED";
  createdAt: Date;
  updatedAt: Date;
}
export type UserDocument = HydratedDocument<User>;
const schema = new Schema<User>(
  {
    username: { type: String, required: true, trim: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["STUDENT", "ADMIN", "STAFF"], required: true },
    fullName: { type: String, required: true, trim: true },
    email: String,
    phone: String,
    avatarUrl: String,
    status: { type: String, enum: ["ACTIVE", "LOCKED"], default: "ACTIVE" },
  },
  { timestamps: true },
);
export const UserModel = model<User>("User", schema);
