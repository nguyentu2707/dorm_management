import { EquipmentCategoryModel } from "../../models/equipment-category.model.js";
import type {
  IEquipmentCategoryRepository,
  EquipmentCategoryData,
} from "../interfaces/equipment-category.repository.interface.js";
import type { ClientSession } from "mongoose";
export class EquipmentCategoryRepository implements IEquipmentCategoryRepository {
  findAll() {
    return EquipmentCategoryModel.find().sort({ name: 1 }).exec();
  }
  findById(id: string) {
    return EquipmentCategoryModel.findById(id).exec();
  }
  async create(d: EquipmentCategoryData, s?: ClientSession) {
    const [x] = await EquipmentCategoryModel.create([d], { session: s });
    return x!;
  }
  update(id: string, d: Partial<EquipmentCategoryData>, s?: ClientSession) {
    return EquipmentCategoryModel.findByIdAndUpdate(id, d, {
      new: true,
      runValidators: true,
      session: s,
    }).exec();
  }
  async deleteById(id: string, s?: ClientSession) {
    await EquipmentCategoryModel.findByIdAndDelete(id, { session: s });
  }
}
