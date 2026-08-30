import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { tokenStorage } from "./token-storage";
import type { ApiError, ApiResponse } from "../types/api";

const baseURL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api/v1";
export const apiClient = axios.create({ baseURL, timeout: 15000 });
let refreshPromise: Promise<string> | null = null;

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const original = error.config as
      (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const shouldRefresh =
      error.response?.status === 401 &&
      error.response.data?.code === "TOKEN_EXPIRED";
    if (
      !original ||
      original._retry ||
      !shouldRefresh ||
      original.url?.includes("refresh-token")
    )
      return Promise.reject(normalizeApiError(error));
    const refreshToken = tokenStorage.getRefresh();
    if (!refreshToken) {
      tokenStorage.clear();
      window.location.assign("/login");
      return Promise.reject(normalizeApiError(error));
    }
    original._retry = true;
    refreshPromise ??= axios
      .post<ApiResponse<{ accessToken: string; refreshToken?: string }>>(
        `${baseURL}/auth/refresh-token`,
        { refreshToken },
      )
      .then(({ data }) => {
        tokenStorage.set(data.data.accessToken, data.data.refreshToken);
        return data.data.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
    try {
      original.headers.Authorization = `Bearer ${await refreshPromise}`;
      return apiClient(original);
    } catch (refreshError) {
      tokenStorage.clear();
      window.location.assign("/login");
      return Promise.reject(normalizeApiError(refreshError));
    }
  },
);

export function normalizeApiError(error: unknown): ApiError {
  if (axios.isAxiosError<ApiError>(error))
    return {
      message: error.response?.data?.message ?? "Không thể kết nối máy chủ",
      code: error.response?.data?.code,
      errors: error.response?.data?.errors,
    };
  if (typeof error === "object" && error && "message" in error)
    return error as ApiError;
  return { message: "Đã xảy ra lỗi không xác định" };
}

export async function dataOf<T>(
  request: Promise<{ data: ApiResponse<T> }>,
): Promise<T> {
  return (await request).data.data;
}
