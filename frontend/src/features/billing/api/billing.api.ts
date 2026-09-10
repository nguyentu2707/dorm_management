import { apiClient, dataOf } from "../../../services/api-client";
import type {
  MonthlyBilling,
  MonthlyBillingPreview,
  Paginated,
  StudentInvoice,
} from "../../../types/api";

export type BillingDraftInput = {
  roomId: string;
  billingPeriod: string;
  electricityCurrent: number;
  waterCurrent: number;
  electricityPrevious?: number;
  waterPrevious?: number;
};
export const billingApi = {
  list: (params: Record<string, string | number | undefined>) =>
    dataOf<Paginated<MonthlyBilling>>(
      apiClient.get("/admin/monthly-billings", { params }),
    ),
  get: (id: string) =>
    dataOf<MonthlyBilling>(apiClient.get(`/admin/monthly-billings/${id}`)),
  saveDraft: (input: BillingDraftInput) =>
    dataOf<MonthlyBilling>(
      apiClient.put("/admin/monthly-billings/draft", input),
    ),
  preview: (id: string) =>
    dataOf<MonthlyBillingPreview>(
      apiClient.post(`/admin/monthly-billings/${id}/preview`),
    ),
  finalize: (id: string) =>
    dataOf<MonthlyBilling>(
      apiClient.post(`/admin/monthly-billings/${id}/finalize`),
    ),
  cancel: (id: string, reason?: string) =>
    dataOf<MonthlyBilling>(
      apiClient.patch(`/admin/monthly-billings/${id}/cancel`, { reason }),
    ),
};
export const studentInvoiceApi = {
  list: (params: Record<string, string | number | undefined>) =>
    dataOf<Paginated<StudentInvoice>>(
      apiClient.get("/student/invoices/me", { params }),
    ),
  get: (id: string) =>
    dataOf<StudentInvoice>(apiClient.get(`/student/invoices/${id}`)),
};
