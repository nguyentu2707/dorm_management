import { apiClient, dataOf } from "../../../services/api-client";
import type { Paginated, Staff } from "../../../types/api";
export type StaffInput = {
  staffCode: string;
  fullName: string;
  phone?: string;
  specialty?: string;
};
export const staffApi = {
  list: (params: Record<string, string | number | undefined>) =>
    dataOf<Paginated<Staff>>(apiClient.get("/admin/staff", { params })),
  create: (input: StaffInput) =>
    dataOf<Staff>(apiClient.post("/admin/staff", input)),
  update: (id: string, input: Partial<StaffInput>) =>
    dataOf<Staff>(apiClient.patch(`/admin/staff/${id}`, input)),
  status: (id: string, status: "ACTIVE" | "INACTIVE") =>
    dataOf<Staff>(apiClient.patch(`/admin/staff/${id}/status`, { status })),
};
