import { apiClient, dataOf } from "../../../services/api-client";
import type { Paginated, UtilityReading } from "../../../types/api";
export const utilityReadingApi = {
  list: (params: Record<string, string | number | undefined>) =>
    dataOf<Paginated<UtilityReading>>(
      apiClient.get("/admin/utility-readings", { params }),
    ),
  mine: () =>
    dataOf<{ items: UtilityReading[] }>(
      apiClient.get("/student/utility-readings/me"),
    ),
};
