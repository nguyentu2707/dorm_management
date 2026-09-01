import { BuildingModel } from "../../models/building.model.js";
import { RoomModel } from "../../models/room.model.js";
import { BedModel } from "../../models/bed.model.js";
import { ContractModel } from "../../models/contract.model.js";
import type { IDemoSeedRepository, SeedBed } from "../interfaces/demo-seed.repository.interface.js";
export class DemoSeedRepository implements IDemoSeedRepository {
  async diagnostics() {
    const [buildings, rooms, bedsTotal, bedsEmpty, bedsOccupied] = await Promise.all([
      BuildingModel.countDocuments(), RoomModel.countDocuments(), BedModel.countDocuments(),
      BedModel.countDocuments({ status: "EMPTY" }), BedModel.countDocuments({ status: "OCCUPIED" }),
    ]);
    return { buildings, rooms, bedsTotal, bedsEmpty, bedsOccupied };
  }
  async bedsStable() {
    const rows = await BedModel.aggregate([
      { $lookup: { from: "rooms", localField: "roomId", foreignField: "_id", as: "room" } }, { $unwind: "$room" },
      { $lookup: { from: "buildings", localField: "room.buildingId", foreignField: "_id", as: "building" } }, { $unwind: "$building" },
      { $project: { _id: 0, id: { $toString: "$_id" }, status: 1, bedNumber: 1, roomId: { $toString: "$roomId" }, roomNumber: "$room.roomNumber", buildingName: "$building.name" } },
      { $sort: { buildingName: 1, roomNumber: 1, bedNumber: 1 } },
    ]);
    return rows as SeedBed[];
  }
  async consistency() {
    const [activeContracts, activeOnNonOccupiedBeds, duplicateRows, fullRoomRows] = await Promise.all([
      ContractModel.countDocuments({ status: "ACTIVE" }),
      ContractModel.aggregate([{ $match: { status: "ACTIVE" } }, { $lookup: { from: "beds", localField: "bedId", foreignField: "_id", as: "bed" } }, { $unwind: "$bed" }, { $match: { "bed.status": { $ne: "OCCUPIED" } } }, { $count: "count" }]),
      ContractModel.aggregate([{ $match: { status: "ACTIVE" } }, { $group: { _id: "$bedId", count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }, { $count: "count" }]),
      RoomModel.aggregate([{ $match: { status: "FULL" } }, { $lookup: { from: "beds", localField: "_id", foreignField: "roomId", as: "beds" } }, { $match: { beds: { $elemMatch: { status: "EMPTY" } } } }, { $count: "count" }]),
    ]);
    return { activeContracts, activeOnNonOccupiedBeds: activeOnNonOccupiedBeds[0]?.count ?? 0, bedsWithMultipleActiveContracts: duplicateRows[0]?.count ?? 0, fullRoomsWithEmptyBeds: fullRoomRows[0]?.count ?? 0 };
  }
}
