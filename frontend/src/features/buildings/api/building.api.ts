import { apiClient, dataOf } from "../../../services/api-client";
import type { Building } from "../../../types/api";
export type BuildingInput = Pick<Building, "name" | "address" | "description">;
export const buildingApi = {
  list: () => dataOf<Building[]>(apiClient.get("/admin/buildings")),
  get: (id: string) =>
    dataOf<Building>(apiClient.get(`/admin/buildings/${id}`)),
  create: (input: BuildingInput) =>
    dataOf<Building>(apiClient.post("/admin/buildings", input)),
  update: (id: string, input: Partial<BuildingInput>) =>
    dataOf<Building>(apiClient.patch(`/admin/buildings/${id}`, input)),
  remove: (id: string) => dataOf(apiClient.delete(`/admin/buildings/${id}`)),
};
