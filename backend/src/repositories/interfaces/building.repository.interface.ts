import type { ClientSession } from "mongoose";
import type { BuildingDocument } from "../../models/building.model.js";
export type BuildingData = {
  name: string;
  address?: string;
  description?: string;
};
export interface IBuildingRepository {
  findAll(): Promise<BuildingDocument[]>;
  findById(id: string): Promise<BuildingDocument | null>;
  create(
    data: BuildingData,
    session?: ClientSession,
  ): Promise<BuildingDocument>;
  update(
    id: string,
    data: Partial<BuildingData>,
    session?: ClientSession,
  ): Promise<BuildingDocument | null>;
  deleteById(id: string, session?: ClientSession): Promise<void>;
}
