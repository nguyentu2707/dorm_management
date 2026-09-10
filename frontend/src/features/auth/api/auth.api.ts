import { apiClient, dataOf } from "../../../services/api-client";
import type { AuthUser } from "../../../types/api";
export interface LoginInput {
  username: string;
  password: string;
}
export interface RegisterInput extends LoginInput {
  mssv: string;
  email: string;
}
export interface AuthPayload {
  accessToken: string;
  user: AuthUser;
}
export const authApi = {
  login: (input: LoginInput) =>
    dataOf<AuthPayload>(apiClient.post("/auth/login", input)),
  register: (input: RegisterInput) =>
    dataOf<AuthPayload>(apiClient.post("/auth/register", input)),
  refresh: () =>
    dataOf<{ accessToken: string }>(apiClient.post("/auth/refresh-token", {})),
  logout: () =>
    dataOf<{ revoked: boolean }>(apiClient.post("/auth/logout", {})),
  me: () => dataOf<AuthUser>(apiClient.get("/auth/me")),
};
