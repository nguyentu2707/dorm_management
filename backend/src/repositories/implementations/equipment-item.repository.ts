import {
  EquipmentItemModel,
  type EquipmentCondition,
} from "../../models/equipment-item.model.js";
import type {
  IEquipmentItemRepository,
  EquipmentItemData,
} from "../interfaces/equipment-item.repository.interface.js";
import type { ClientSession } from "mongoose";
export class EquipmentItemRepository implements IEquipmentItemRepository {
  findById(id: string) {
    return EquipmentItemModel.findById(id).exec();
  }
  async findByRoomId(id: string, page: number, limit: number) {
    const f = { roomId: id };
    const [items, total] = await Promise.all([
      EquipmentItemModel.find(f)
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 }),
      EquipmentItemModel.countDocuments(f),
    ]);
    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
  countByCategoryId(id: string) {
    return EquipmentItemModel.countDocuments({ categoryId: id });
  }
  countByRoomId(id: string) {
    return EquipmentItemModel.countDocuments({ roomId: id });
  }
  async create(d: EquipmentItemData, s?: ClientSession) {
    const [x] = await EquipmentItemModel.create([d], { session: s });
    return x!;
  }
  update(
    id: string,
    d: Partial<Omit<EquipmentItemData, "roomId">>,
    s?: ClientSession,
  ) {
    return EquipmentItemModel.findByIdAndUpdate(id, d, {
      new: true,
      runValidators: true,
      session: s,
    }).exec();
  }
  updateCondition(
    id: string,
    condition: EquipmentCondition,
    s?: ClientSession,
  ) {
    return EquipmentItemModel.findByIdAndUpdate(
      id,
      { condition },
      { new: true, runValidators: true, session: s },
    ).exec();
  }
  async deleteById(id: string, s?: ClientSession) {
    await EquipmentItemModel.findByIdAndDelete(id, { session: s });
  }
}
