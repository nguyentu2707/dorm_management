import { apiClient, dataOf } from "../../../services/api-client";
import type { DashboardSummary, DashboardTrends } from "../../../types/api";
export const dashboardApi = {
  summary: () =>
    dataOf<DashboardSummary>(apiClient.get("/admin/dashboard/summary")),
  trends: (months = 6) =>
    dataOf<DashboardTrends>(
      apiClient.get("/admin/dashboard/trends", { params: { months } }),
    ),
};
