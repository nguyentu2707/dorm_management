import { apiClient, dataOf } from "../../../services/api-client";
import type {
  Bed,
  Equipment,
  Paginated,
  Room,
  Status,
} from "../../../types/api";
export type RoomInput = {
  roomTypeId: string;
  roomNumber: string;
  floor: number;
};
export const roomApi = {
  list: (
    buildingId: string,
    params: Record<string, string | number | undefined>,
  ) =>
    dataOf<Paginated<Room>>(
      apiClient.get(`/admin/buildings/${buildingId}/rooms`, { params }),
    ),
  get: (id: string) => dataOf<Room>(apiClient.get(`/admin/rooms/${id}`)),
  create: (buildingId: string, input: RoomInput) =>
    dataOf<Room>(apiClient.post(`/admin/buildings/${buildingId}/rooms`, input)),
  update: (id: string, input: Partial<RoomInput>) =>
    dataOf<Room>(apiClient.patch(`/admin/rooms/${id}`, input)),
  status: (id: string, status: Status) =>
    dataOf<Room>(apiClient.patch(`/admin/rooms/${id}/status`, { status })),
  remove: (id: string) => dataOf(apiClient.delete(`/admin/rooms/${id}`)),
  beds: (id: string) => dataOf<Bed[]>(apiClient.get(`/admin/rooms/${id}/beds`)),
  equipment: (id: string, page = 1) =>
    dataOf<Paginated<Equipment>>(
      apiClient.get(`/admin/rooms/${id}/equipment`, { params: { page } }),
    ),
};
