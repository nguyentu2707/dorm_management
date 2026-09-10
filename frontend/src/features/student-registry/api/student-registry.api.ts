import { apiClient, dataOf } from "../../../services/api-client";
import type { Paginated, StudentRegistryRecord } from "../../../types/api";
export type RegistryInput = {
  studentCode: string;
  fullName: string;
  email: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  dateOfBirth?: string;
};
export const studentRegistryApi = {
  list: (params: Record<string, string | number | undefined>) =>
    dataOf<Paginated<StudentRegistryRecord>>(
      apiClient.get("/admin/student-registry", { params }),
    ),
  create: (input: RegistryInput) =>
    dataOf<StudentRegistryRecord>(apiClient.post("/admin/student-registry", input)),
  update: (id: string, input: Partial<RegistryInput>) =>
    dataOf<StudentRegistryRecord>(apiClient.patch(`/admin/student-registry/${id}`, input)),
  status: (id: string, status: "AVAILABLE" | "DISABLED") =>
    dataOf<StudentRegistryRecord>(apiClient.patch(`/admin/student-registry/${id}/status`, { status })),
};
