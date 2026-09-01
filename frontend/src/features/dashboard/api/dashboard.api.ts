import { apiClient, dataOf } from "../../../services/api-client";
import type { DashboardSummary } from "../../../types/api";
export const dashboardApi = {
  summary: () =>
    dataOf<DashboardSummary>(apiClient.get("/admin/dashboard/summary")),
};
