import { apiClient, dataOf } from "../../../services/api-client";
import type { CheckoutRequest, Paginated } from "../../../types/api";
export const checkoutApi = {
  mine: () =>
    dataOf<CheckoutRequest[]>(apiClient.get("/student/checkout-requests/me")),
  create: (reason?: string) =>
    dataOf<CheckoutRequest>(
      apiClient.post("/student/checkout-requests", { reason }),
    ),
  cancel: (id: string) =>
    dataOf<CheckoutRequest>(
      apiClient.patch(`/student/checkout-requests/${id}/cancel`),
    ),
  list: (params: Record<string, string | number | undefined>) =>
    dataOf<Paginated<CheckoutRequest>>(
      apiClient.get("/admin/checkout-requests", { params }),
    ),
  approve: (id: string) =>
    dataOf<CheckoutRequest>(
      apiClient.patch(`/admin/checkout-requests/${id}/approve`),
    ),
  reject: (id: string, rejectReason?: string) =>
    dataOf<CheckoutRequest>(
      apiClient.patch(`/admin/checkout-requests/${id}/reject`, {
        rejectReason,
      }),
    ),
};
