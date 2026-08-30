import { apiClient, dataOf } from "../../../services/api-client";
import type { AuthUser } from "../../../types/api";
export interface LoginInput {
  username: string;
  password: string;
}
export interface RegisterInput extends LoginInput {
  fullName: string;
  mssv: string;
  email?: string;
}
export interface AuthPayload {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}
export const authApi = {
  login: (input: LoginInput) =>
    dataOf<AuthPayload>(apiClient.post("/auth/login", input)),
  register: (input: RegisterInput) =>
    dataOf<AuthPayload>(apiClient.post("/auth/register", input)),
  me: () => dataOf<AuthUser>(apiClient.get("/auth/me")),
};
