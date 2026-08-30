import { apiClient, dataOf } from "../../../services/api-client";
import type { Bed, StudentBuilding, StudentRoom } from "../../../types/api";

export const studentFacilityApi = {
  buildings: () =>
    dataOf<StudentBuilding[]>(apiClient.get("/student/buildings")),
  rooms: (buildingId: string) =>
    dataOf<StudentRoom[]>(
      apiClient.get(`/student/buildings/${buildingId}/rooms`),
    ),
  room: (roomId: string) =>
    dataOf<StudentRoom>(apiClient.get(`/student/rooms/${roomId}`)),
  emptyBeds: (roomId: string) =>
    dataOf<Bed[]>(apiClient.get(`/student/rooms/${roomId}/beds`)),
};
