import { apiClient, dataOf } from "../../../services/api-client";
import type { ResidenceHistoryResponse } from "../../../types/api";
export const residenceHistoryApi = {
  mine: () =>
    dataOf<ResidenceHistoryResponse>(
      apiClient.get("/student/residence-history/me"),
    ),
  student: (studentId: string) =>
    dataOf<ResidenceHistoryResponse>(
      apiClient.get(`/admin/students/${studentId}/residence-history`),
    ),
};
