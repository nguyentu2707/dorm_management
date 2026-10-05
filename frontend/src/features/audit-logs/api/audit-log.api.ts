import { apiClient, dataOf } from "../../../services/api-client";
import type { AuditLog, Paginated } from "../../../types/api";
export const auditLogApi = {
  list: (params: Record<string, string | number | undefined>) =>
    dataOf<Paginated<AuditLog>>(apiClient.get("/admin/audit-logs", { params })),
  detail: (id: string) =>
    dataOf<AuditLog>(apiClient.get(`/admin/audit-logs/${id}`)),
};
