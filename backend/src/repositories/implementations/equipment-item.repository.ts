import {
  EquipmentItemModel,
  type EquipmentCondition,
} from "../../models/equipment-item.model.js";
import type {
  IEquipmentItemRepository,
  EquipmentItemData,
  EquipmentListQuery,
  AdminEquipmentRecord,
} from "../interfaces/equipment-item.repository.interface.js";
import type { ClientSession } from "mongoose";
export class EquipmentItemRepository implements IEquipmentItemRepository {
  findBySerialNumber(serialNumber: string) {
    return EquipmentItemModel.findOne({ serialNumber }).exec();
  }
  async findAll(q: EquipmentListQuery) {
    const match: Record<string, unknown> = {};
    if (q.search)
      match.serialNumber = {
        $regex: q.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        $options: "i",
      };
    if (q.categoryId)
      match.categoryId = new (await import("mongoose")).Types.ObjectId(
        q.categoryId,
      );
    if (q.roomId)
      match.roomId = new (await import("mongoose")).Types.ObjectId(q.roomId);
    if (q.condition) match.condition = q.condition;
    const pipeline: Record<string, unknown>[] = [
      { $match: match },
      {
        $lookup: {
          from: "rooms",
          localField: "roomId",
          foreignField: "_id",
          as: "room",
        },
      },
      { $unwind: "$room" },
      {
        $lookup: {
          from: "buildings",
          localField: "room.buildingId",
          foreignField: "_id",
          as: "building",
        },
      },
      { $unwind: "$building" },
      {
        $lookup: {
          from: "equipmentcategories",
          localField: "categoryId",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
    ];
    if (q.buildingId)
      pipeline.push({
        $match: {
          "building._id": new (await import("mongoose")).Types.ObjectId(
            q.buildingId,
          ),
        },
      });
    pipeline.push({
      $project: {
        _id: 0,
        id: { $toString: "$_id" },
        serialNumber: 1,
        condition: 1,
        purchaseDate: 1,
        purchasePrice: 1,
        category: {
          id: { $toString: "$category._id" },
          name: "$category.name",
        },
        room: {
          id: { $toString: "$room._id" },
          roomNumber: "$room.roomNumber",
          buildingId: { $toString: "$building._id" },
          buildingName: "$building.name",
        },
      },
    });
    const aggregatePipeline = [
      ...pipeline,
      {
        $facet: {
          items: [
            { $sort: { serialNumber: 1 } },
            { $skip: (q.page - 1) * q.limit },
            { $limit: q.limit },
          ],
          meta: [{ $count: "total" }],
        },
      },
    ];
    const [result] = await EquipmentItemModel.aggregate(
      aggregatePipeline as never,
    );
    const items = (result?.items ?? []) as AdminEquipmentRecord[];
    const total = result?.meta?.[0]?.total ?? 0;
    return {
      items,
      pagination: {
        page: q.page,
        limit: q.limit,
        total,
        totalPages: Math.ceil(total / q.limit),
      },
    };
  }
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
