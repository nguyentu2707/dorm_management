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
export type UserDocument = User & { id: string };
