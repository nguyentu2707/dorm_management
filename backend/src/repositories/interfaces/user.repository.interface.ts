import type { TransactionContext } from "../../services/transaction-manager.js";
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
  findById(id: string, session?: TransactionContext): Promise<UserDocument | null>;
  findByIdForUpdate(
    id: string,
    session: TransactionContext,
  ): Promise<UserDocument | null>;
  findByUsername(username: string, session?: TransactionContext): Promise<UserDocument | null>;
  findByEmailNormalized(
    email: string,
    session?: TransactionContext,
  ): Promise<UserDocument | null>;
  create(
    data: CreateUserData,
    session?: TransactionContext,
  ): Promise<UserDocument>;
  updateProfile(
    id: string,
    data: UpdateUserProfileData,
    session?: TransactionContext,
  ): Promise<UserDocument | null>;
  updatePassword(
    id: string,
    passwordHash: string,
    session?: TransactionContext,
  ): Promise<UserDocument | null>;
  updateStatus(
    id: string,
    status: "ACTIVE" | "LOCKED",
    session?: TransactionContext,
  ): Promise<UserDocument | null>;
  deleteById(id: string, session?: TransactionContext): Promise<void>;
}
