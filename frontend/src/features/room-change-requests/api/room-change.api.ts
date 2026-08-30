import { apiClient, dataOf } from "../../../services/api-client";
import type { Paginated, RoomChangeRequest } from "../../../types/api";
export const roomChangeApi = {
  mine: () =>
    dataOf<RoomChangeRequest[]>(
      apiClient.get("/student/room-change-requests/me"),
    ),
  create: (targetBedId: string, reason?: string) =>
    dataOf<RoomChangeRequest>(
      apiClient.post("/student/room-change-requests", { targetBedId, reason }),
    ),
  cancel: (id: string) =>
    dataOf<RoomChangeRequest>(
      apiClient.patch(`/student/room-change-requests/${id}/cancel`),
    ),
  adminList: (params: Record<string, string | number | undefined>) =>
    dataOf<Paginated<RoomChangeRequest>>(
      apiClient.get("/admin/room-change-requests", { params }),
    ),
  get: (id: string) =>
    dataOf<RoomChangeRequest>(
      apiClient.get(`/admin/room-change-requests/${id}`),
    ),
  approve: (id: string) =>
    dataOf<RoomChangeRequest>(
      apiClient.patch(`/admin/room-change-requests/${id}/approve`),
    ),
  reject: (id: string, reason?: string) =>
    dataOf<RoomChangeRequest>(
      apiClient.patch(`/admin/room-change-requests/${id}/reject`, { reason }),
    ),
};
