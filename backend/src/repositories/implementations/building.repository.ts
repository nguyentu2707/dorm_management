import { BuildingModel } from "../../models/building.model.js";
import type {
  IBuildingRepository,
  BuildingData,
} from "../interfaces/building.repository.interface.js";
import type { ClientSession } from "mongoose";
export class BuildingRepository implements IBuildingRepository {
  findAll() {
    return BuildingModel.find().sort({ name: 1 }).exec();
  }
  findById(id: string) {
    return BuildingModel.findById(id).exec();
  }
  async create(d: BuildingData, s?: ClientSession) {
    const [x] = await BuildingModel.create([d], { session: s });
    return x!;
  }
  update(id: string, d: Partial<BuildingData>, s?: ClientSession) {
    return BuildingModel.findByIdAndUpdate(id, d, {
      new: true,
      runValidators: true,
      session: s,
    }).exec();
  }
  async deleteById(id: string, s?: ClientSession) {
    await BuildingModel.findByIdAndDelete(id, { session: s });
  }
}
