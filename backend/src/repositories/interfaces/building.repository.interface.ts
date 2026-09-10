import type { TransactionContext } from "../../services/transaction-manager.js";
import type { BuildingDocument, BuildingGender, BuildingStatus } from "../../models/building.model.js";
export type BuildingData = {
  name: string;
  address?: string;
  description?: string;
  status?: BuildingStatus;
  allowedGender?: BuildingGender;
};
export type BuildingSummary = BuildingDocument & {
  floorCount: number;
  roomCount: number;
  totalBeds: number;
  occupiedBeds: number;
  emptyBeds: number;
};
export type BuildingFloorRoom = {
  id: string;
  roomNumber: string;
  floor: number;
  status: string;
  roomTypeId: string;
  roomTypeName: string;
  capacity: number;
  totalBeds: number;
  occupiedBeds: number;
  emptyBeds: number;
};
export interface IBuildingRepository {
  findAll(): Promise<BuildingDocument[]>;
  findAllWithSummaries(): Promise<BuildingSummary[]>;
  findFloorRooms(id: string): Promise<BuildingFloorRoom[]>;
  findById(
    id: string,
    session?: TransactionContext,
  ): Promise<BuildingDocument | null>;
  create(
    data: BuildingData,
    session?: TransactionContext,
  ): Promise<BuildingDocument>;
  update(
    id: string,
    data: Partial<BuildingData>,
    session?: TransactionContext,
  ): Promise<BuildingDocument | null>;
  deleteById(id: string, session?: TransactionContext): Promise<void>;
}
