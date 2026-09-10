import { apiClient, dataOf } from "../../../services/api-client";
import type { Building, BuildingOverview } from "../../../types/api";
export type BuildingInput = Pick<Building, "name" | "address" | "description" | "status" | "allowedGender">;
export const buildingApi = {
  list: () => dataOf<Building[]>(apiClient.get("/admin/buildings")),
  get: (id: string) =>
    dataOf<Building>(apiClient.get(`/admin/buildings/${id}`)),
  overview: (id: string) =>
    dataOf<BuildingOverview>(apiClient.get(`/admin/buildings/${id}/overview`)),
  create: (input: BuildingInput) =>
    dataOf<Building>(apiClient.post("/admin/buildings", input)),
  update: (id: string, input: Partial<BuildingInput>) =>
    dataOf<Building>(apiClient.patch(`/admin/buildings/${id}`, input)),
  remove: (id: string) => dataOf(apiClient.delete(`/admin/buildings/${id}`)),
};
