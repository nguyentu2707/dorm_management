import { Types, type ClientSession, type FilterQuery } from "mongoose";
import {
  RoomChangeRequestModel,
  type RoomChangeRequest,
  type RoomChangeRequestStatus,
} from "../../models/room-change-request.model.js";
import type {
  IRoomChangeRequestRepository,
  RoomChangeRequestListQuery,
  CreateRoomChangeRequestData,
  RoomChangeRequestStatusMetadata,
} from "../interfaces/room-change-request.repository.interface.js";
export class RoomChangeRequestRepository implements IRoomChangeRequestRepository {
  async findDisplaySummaries(ids: string[]) {
    if (!ids.length) return new Map();
    const rows = await RoomChangeRequestModel.aggregate([
      { $match: { _id: { $in: ids.map((id) => new Types.ObjectId(id)) } } },
      { $lookup: { from: "students", localField: "studentId", foreignField: "_id", as: "studentDoc" } },
      { $unwind: { path: "$studentDoc", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "users", localField: "studentDoc.userId", foreignField: "_id", as: "userDoc" } },
      { $unwind: { path: "$userDoc", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "contracts", localField: "currentContractId", foreignField: "_id", as: "contractDoc" } },
      { $unwind: { path: "$contractDoc", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "beds", localField: "contractDoc.bedId", foreignField: "_id", as: "currentBedDoc" } },
      { $unwind: { path: "$currentBedDoc", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "rooms", localField: "contractDoc.roomId", foreignField: "_id", as: "currentRoomDoc" } },
      { $unwind: { path: "$currentRoomDoc", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "buildings", localField: "currentRoomDoc.buildingId", foreignField: "_id", as: "currentBuildingDoc" } },
      { $unwind: { path: "$currentBuildingDoc", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "beds", localField: "targetBedId", foreignField: "_id", as: "targetBedDoc" } },
      { $unwind: { path: "$targetBedDoc", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "rooms", localField: "targetBedDoc.roomId", foreignField: "_id", as: "targetRoomDoc" } },
      { $unwind: { path: "$targetRoomDoc", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "buildings", localField: "targetRoomDoc.buildingId", foreignField: "_id", as: "targetBuildingDoc" } },
      { $unwind: { path: "$targetBuildingDoc", preserveNullAndEmptyArrays: true } },
      { $project: {
        requestId: { $toString: "$_id" },
        student: { id: { $toString: "$studentId" }, mssv: { $ifNull: ["$studentDoc.mssv", "—"] }, fullName: { $ifNull: ["$userDoc.fullName", "Sinh viên"] } },
        currentRoom: { roomNumber: { $ifNull: ["$currentRoomDoc.roomNumber", "—"] }, buildingName: { $ifNull: ["$currentBuildingDoc.name", "—"] }, bedNumber: { $ifNull: ["$currentBedDoc.bedNumber", "—"] } },
        targetRoom: { roomNumber: { $ifNull: ["$targetRoomDoc.roomNumber", "—"] }, buildingName: { $ifNull: ["$targetBuildingDoc.name", "—"] }, bedNumber: { $ifNull: ["$targetBedDoc.bedNumber", "—"] } },
      } },
    ]);
    return new Map(rows.map((row) => [row.requestId, { student: row.student, currentRoom: row.currentRoom, targetRoom: row.targetRoom }]));
  }
  findById(id: string, s?: ClientSession) {
    return RoomChangeRequestModel.findById(id)
      .session(s ?? null)
      .exec();
  }
  async findAll(q: RoomChangeRequestListQuery) {
    const f: FilterQuery<RoomChangeRequest> = {};
    if (q.status) f.status = q.status;
    if (q.studentId) f.studentId = q.studentId;
    const [items, total] = await Promise.all([
      RoomChangeRequestModel.find(f)
        .skip((q.page - 1) * q.limit)
        .limit(q.limit)
        .sort({ createdAt: -1 }),
      RoomChangeRequestModel.countDocuments(f),
    ]);
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
  findByStudentId(id: string) {
    return RoomChangeRequestModel.find({ studentId: id })
      .sort({ createdAt: -1 })
      .exec();
  }
  findPendingByStudentId(id: string, s?: ClientSession) {
    return RoomChangeRequestModel.findOne({ studentId: id, status: "PENDING" })
      .session(s ?? null)
      .exec();
  }
  async create(d: CreateRoomChangeRequestData, s?: ClientSession) {
    const [x] = await RoomChangeRequestModel.create([d], { session: s });
    return x!;
  }
  updateStatus(
    id: string,
    status: RoomChangeRequestStatus,
    extra: Partial<RoomChangeRequestStatusMetadata> = {},
    s?: ClientSession,
  ) {
    return RoomChangeRequestModel.findByIdAndUpdate(
      id,
      { status, ...extra },
      { new: true, runValidators: true, session: s },
    ).exec();
  }
}
