import { apiClient, dataOf } from "../../../services/api-client";
import type { RoomType } from "../../../types/api";
export type RoomTypeInput = Pick<
  RoomType,
  "name" | "capacity" | "pricePerMonth" | "description"
>;
export const roomTypeApi = {
  list: () => dataOf<RoomType[]>(apiClient.get("/admin/room-types")),
  create: (input: RoomTypeInput) =>
    dataOf<RoomType>(apiClient.post("/admin/room-types", input)),
  update: (id: string, input: Partial<RoomTypeInput>) =>
    dataOf<RoomType>(apiClient.patch(`/admin/room-types/${id}`, input)),
  remove: (id: string) => dataOf(apiClient.delete(`/admin/room-types/${id}`)),
};
