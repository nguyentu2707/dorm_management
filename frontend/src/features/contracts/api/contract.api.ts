import { apiClient, dataOf } from "../../../services/api-client";
import type { Contract, Paginated } from "../../../types/api";
export interface CreateContractInput {
  bedId: string;
}
export interface AdminCreateContractInput extends CreateContractInput {
  studentId: string;
  startDate?: string;
  endDate?: string;
}
export const contractApi = {
  mine: () => dataOf<Contract[]>(apiClient.get("/student/contracts/me")),
  active: () =>
    dataOf<Contract | null>(apiClient.get("/student/contracts/me/active")),
  create: (i: CreateContractInput) =>
    dataOf<Contract>(apiClient.post("/student/contracts", i)),
  cancel: (id: string, reason?: string) =>
    dataOf<Contract>(
      apiClient.patch(`/student/contracts/${id}/cancel`, { reason }),
    ),
  adminList: (params: Record<string, string | number | undefined>) =>
    dataOf<Paginated<Contract>>(apiClient.get("/admin/contracts", { params })),
  get: (id: string) =>
    dataOf<Contract>(apiClient.get(`/admin/contracts/${id}`)),
  approve: (id: string) =>
    dataOf<Contract>(apiClient.patch(`/admin/contracts/${id}/approve`)),
  reject: (id: string, reason?: string) =>
    dataOf<Contract>(
      apiClient.patch(`/admin/contracts/${id}/reject`, { reason }),
    ),
  end: (id: string) =>
    dataOf<Contract>(apiClient.patch(`/admin/contracts/${id}/end`)),
  cancelActive: (id: string, reason: string) =>
    dataOf<Contract>(
      apiClient.patch(`/admin/contracts/${id}/cancel`, { reason }),
    ),
  adminCreate: (i: AdminCreateContractInput) =>
    dataOf<Contract>(apiClient.post("/admin/contracts", i)),
};
