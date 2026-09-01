import { apiClient, dataOf } from "../../../services/api-client";
import type { AdminStudent, Paginated } from "../../../types/api";
export const adminStudentApi = {
  list: (params: Record<string, string | number | undefined>) =>
    dataOf<Paginated<AdminStudent>>(
      apiClient.get("/admin/students", { params }),
    ),
  get: (id: string) =>
    dataOf<AdminStudent>(apiClient.get(`/admin/students/${id}`)),
};
