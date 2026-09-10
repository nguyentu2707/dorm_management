import { apiClient, dataOf } from "../../../services/api-client";
import type {
  Equipment,
  MaintenanceCategory,
  MaintenanceDamageCause,
  MaintenanceRequest,
  MaintenanceResolutionMethod,
  Paginated,
} from "../../../types/api";
export const studentMaintenanceApi = {
  equipment: () =>
    dataOf<Paginated<Equipment>>(apiClient.get("/student/rooms/me/equipment")),
  mine: () =>
    dataOf<MaintenanceRequest[]>(
      apiClient.get("/student/maintenance-requests/me"),
    ),
  create: (input: {
    category: MaintenanceCategory;
    description: string;
    equipmentItemId?: string;
  }) =>
    dataOf<MaintenanceRequest>(
      apiClient.post("/student/maintenance-requests", input),
    ),
  cancel: (id: string, reason?: string) =>
    dataOf<MaintenanceRequest>(
      apiClient.patch(`/student/maintenance-requests/${id}/cancel`, { reason }),
    ),
};
export const adminMaintenanceApi = {
  staff: () =>
    dataOf<Array<{ id: string; fullName: string; username: string }>>(
      apiClient.get("/admin/maintenance-staff"),
    ),
  list: (params: Record<string, string | number | undefined>) =>
    dataOf<Paginated<MaintenanceRequest>>(
      apiClient.get("/admin/maintenance-requests", { params }),
    ),
  assign: (id: string, staffId: string) =>
    dataOf<MaintenanceRequest>(
      apiClient.patch(`/admin/maintenance-requests/${id}/assign`, { staffId }),
    ),
  resolve: (
    id: string,
    input: {
      resolutionMethod: MaintenanceResolutionMethod;
      damageCause: MaintenanceDamageCause;
      damageCauseDetail?: string;
      resolutionReason: string;
      resolutionCost: number;
      resolutionNote?: string;
    },
  ) =>
    dataOf<MaintenanceRequest>(
      apiClient.patch(`/admin/maintenance-requests/${id}/resolve`, input),
    ),
  cancel: (id: string, reason?: string) =>
    dataOf<MaintenanceRequest>(
      apiClient.patch(`/admin/maintenance-requests/${id}/cancel`, { reason }),
    ),
};
