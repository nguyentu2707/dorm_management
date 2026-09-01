import { apiClient, dataOf } from "../../../services/api-client";
import type {
  AdminEquipment,
  Equipment,
  EquipmentCategory,
  Paginated,
  Status,
} from "../../../types/api";
export type CategoryInput = Pick<
  EquipmentCategory,
  "name" | "unit" | "defaultLifespanMonths"
>;
export type EquipmentInput = {
  categoryId: string;
  serialNumber?: string;
  condition?: Status;
  purchaseDate?: string;
  purchasePrice?: number;
};
export const categoryApi = {
  list: () =>
    dataOf<EquipmentCategory[]>(apiClient.get("/admin/equipment-categories")),
  create: (i: CategoryInput) =>
    dataOf<EquipmentCategory>(apiClient.post("/admin/equipment-categories", i)),
  update: (id: string, i: Partial<CategoryInput>) =>
    dataOf<EquipmentCategory>(
      apiClient.patch(`/admin/equipment-categories/${id}`, i),
    ),
  remove: (id: string) =>
    dataOf(apiClient.delete(`/admin/equipment-categories/${id}`)),
};
export const equipmentApi = {
  list: (params: Record<string, string | number | undefined>) =>
    dataOf<Paginated<AdminEquipment>>(
      apiClient.get("/admin/equipment", { params }),
    ),
  create: (roomId: string, i: EquipmentInput) =>
    dataOf<Equipment>(apiClient.post(`/admin/rooms/${roomId}/equipment`, i)),
  get: (id: string) =>
    dataOf<Equipment>(apiClient.get(`/admin/equipment/${id}`)),
  update: (id: string, i: Partial<EquipmentInput>) =>
    dataOf<Equipment>(apiClient.patch(`/admin/equipment/${id}`, i)),
  condition: (id: string, condition: Status) =>
    dataOf<Equipment>(
      apiClient.patch(`/admin/equipment/${id}/condition`, { condition }),
    ),
  remove: (id: string) => dataOf(apiClient.delete(`/admin/equipment/${id}`)),
};
