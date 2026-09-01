import { RoomModel } from "../../models/room.model.js";
import type { IRoomRecommendationRepository, RecommendationCandidate } from "../interfaces/room-recommendation.repository.interface.js";

export class RoomRecommendationRepository implements IRoomRecommendationRepository {
  async findCandidates() {
    const rows = await RoomModel.aggregate([
      { $match: { status: "AVAILABLE" } },
      { $lookup: { from: "buildings", localField: "buildingId", foreignField: "_id", as: "building" } },
      { $unwind: "$building" },
      { $lookup: { from: "roomtypes", localField: "roomTypeId", foreignField: "_id", as: "roomType" } },
      { $unwind: "$roomType" },
      { $lookup: { from: "beds", localField: "_id", foreignField: "roomId", as: "beds" } },
      { $set: {
        emptyBeds: { $filter: { input: "$beds", as: "bed", cond: { $eq: ["$$bed.status", "EMPTY"] } } },
        occupiedBeds: { $filter: { input: "$beds", as: "bed", cond: { $eq: ["$$bed.status", "OCCUPIED"] } } },
      } },
      { $match: { "emptyBeds.0": { $exists: true } } },
      { $lookup: {
        from: "equipmentitems",
        let: { roomId: "$_id" },
        pipeline: [
          { $match: { $expr: { $and: [{ $eq: ["$roomId", "$$roomId"] }, { $in: ["$condition", ["NEW", "GOOD"]] }] } } },
          { $lookup: { from: "equipmentcategories", localField: "categoryId", foreignField: "_id", as: "category" } },
          { $unwind: "$category" },
          { $match: { "category.name": { $regex: /^bình nóng lạnh$/i } } },
          { $limit: 1 },
        ],
        as: "hotWaterItems",
      } },
      { $lookup: {
        from: "contracts",
        let: { roomId: "$_id" },
        pipeline: [
          { $match: { $expr: { $and: [{ $eq: ["$roomId", "$$roomId"] }, { $eq: ["$status", "ACTIVE"] }] } } },
          { $lookup: { from: "classschedules", localField: "studentId", foreignField: "studentId", as: "schedule" } },
          { $set: { schedule: { $first: "$schedule" } } },
          { $project: { entries: "$schedule.entries" } },
        ],
        as: "residents",
      } },
      { $project: {
        _id: 0,
        room: {
          id: { $toString: "$_id" }, roomNumber: "$roomNumber",
          building: { id: { $toString: "$building._id" }, name: "$building.name" },
          pricePerMonth: "$roomType.pricePerMonth", capacity: "$roomType.capacity",
        },
        availableBedCount: { $size: "$emptyBeds" },
        occupiedBedCount: { $size: "$occupiedBeds" },
        hasHotWater: { $gt: [{ $size: "$hotWaterItems" }, 0] },
        residentSchedules: { $map: { input: { $filter: { input: "$residents", as: "resident", cond: { $isArray: "$$resident.entries" } } }, as: "resident", in: "$$resident.entries" } },
      } },
      { $sort: { "room.building.name": 1, "room.roomNumber": 1 } },
    ]);
    return rows as RecommendationCandidate[];
  }
}
