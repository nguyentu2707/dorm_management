export type SeedBed = { id: string; status: "EMPTY" | "OCCUPIED"; bedNumber: string; roomId: string; roomNumber: string; buildingName: string };
export type DormitoryDiagnostics = { buildings: number; rooms: number; bedsTotal: number; bedsEmpty: number; bedsOccupied: number };
export type ConsistencyReport = { activeContracts: number; activeOnNonOccupiedBeds: number; bedsWithMultipleActiveContracts: number; fullRoomsWithEmptyBeds: number };
export interface IDemoSeedRepository {
  diagnostics(): Promise<DormitoryDiagnostics>;
  bedsStable(): Promise<SeedBed[]>;
  consistency(): Promise<ConsistencyReport>;
}
