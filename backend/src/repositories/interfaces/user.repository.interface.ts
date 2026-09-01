import type { ClientSession } from "mongoose";
import type { UserDocument } from "../../models/user.model.js";
import type { Role } from "../../types/common.types.js";
export type CreateUserData = {
  username: string;
  passwordHash: string;
  role: Role;
  fullName: string;
  email?: string;
};
export type UpdateUserProfileData = {
  fullName?: string;
  email?: string;
  phone?: string;
};
export interface IUserRepository {
  findById(id: string): Promise<UserDocument | null>;
  findByUsername(username: string): Promise<UserDocument | null>;
  create(data: CreateUserData, session?: ClientSession): Promise<UserDocument>;
  updateProfile(
    id: string,
    data: UpdateUserProfileData,
    session?: ClientSession,
  ): Promise<UserDocument | null>;
  updatePassword(
    id: string,
    passwordHash: string,
  ): Promise<UserDocument | null>;
  deleteById(id: string, session?: ClientSession): Promise<void>;
}
