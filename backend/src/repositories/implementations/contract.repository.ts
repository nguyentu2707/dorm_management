import { Types, type ClientSession, type FilterQuery } from "mongoose";
import { ContractModel, type Contract } from "../../models/contract.model.js";
import type {
  IContractRepository,
  ContractListQuery,
  CreateContractData,
  ContractStatusMetadata,
} from "../interfaces/contract.repository.interface.js";
import type { ContractStatus } from "../../models/contract.model.js";
export class ContractRepository implements IContractRepository {
  async findDisplaySummaries(ids: string[]) {
    if (!ids.length) return new Map();
    const rows = await ContractModel.aggregate([
      { $match: { _id: { $in: ids.map((id) => new Types.ObjectId(id)) } } },
      {
        $lookup: {
          from: "students",
          localField: "studentId",
          foreignField: "_id",
          as: "student",
        },
      },
      { $unwind: { path: "$student", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "student.userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "rooms",
          localField: "roomId",
          foreignField: "_id",
          as: "room",
        },
      },
      { $unwind: { path: "$room", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "buildings",
          localField: "room.buildingId",
          foreignField: "_id",
          as: "building",
        },
      },
      { $unwind: { path: "$building", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "beds",
          localField: "bedId",
          foreignField: "_id",
          as: "bed",
        },
      },
      { $unwind: { path: "$bed", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          contractId: { $toString: "$_id" },
          student: {
            id: { $toString: "$studentId" },
            mssv: { $ifNull: ["$student.mssv", "—"] },
            fullName: { $ifNull: ["$user.fullName", "Sinh viên"] },
          },
          room: {
            id: { $toString: "$roomId" },
            roomNumber: { $ifNull: ["$room.roomNumber", "—"] },
            buildingName: { $ifNull: ["$building.name", "—"] },
          },
          bed: {
            id: { $toString: "$bedId" },
            bedNumber: { $ifNull: ["$bed.bedNumber", "—"] },
          },
        },
      },
    ]);
    return new Map(
      rows.map((row) => [
        row.contractId,
        { student: row.student, room: row.room, bed: row.bed },
      ]),
    );
  }
  async findActiveStudentIdsByBuildingId(
    buildingId: string,
    s?: ClientSession,
  ) {
    const { Types } = await import("mongoose");
    const rows = await ContractModel.aggregate([
      { $match: { status: "ACTIVE" } },
      {
        $lookup: {
          from: "rooms",
          localField: "roomId",
          foreignField: "_id",
          as: "room",
        },
      },
      { $unwind: "$room" },
      { $match: { "room.buildingId": new Types.ObjectId(buildingId) } },
      { $group: { _id: "$studentId" } },
    ]).session(s ?? null);
    return rows.map((row) => row._id as import("mongoose").Types.ObjectId);
  }
  findById(id: string, s?: ClientSession) {
    return ContractModel.findById(id)
      .session(s ?? null)
      .exec();
  }
  async findAll(q: ContractListQuery) {
    const f: FilterQuery<Contract> = {};
    if (q.status) f.status = q.status;
    if (q.studentId) f.studentId = q.studentId;
    if (q.roomId) f.roomId = q.roomId;
    if (q.buildingId) {
      const rooms = await import("../../models/room.model.js").then((m) =>
        m.RoomModel.find({ buildingId: q.buildingId }).distinct("_id"),
      );
      f.roomId = { $in: rooms };
    }
    const sortField = q.sortBy ?? "createdAt",
      direction = q.sortOrder === "asc" ? 1 : -1;
    const [items, total] = await Promise.all([
      ContractModel.find(f)
        .skip((q.page - 1) * q.limit)
        .limit(q.limit)
        .sort({ [sortField]: direction }),
      ContractModel.countDocuments(f),
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
    return ContractModel.find({ studentId: id }).sort({ createdAt: -1 }).exec();
  }
  findActiveByStudentId(id: string, s?: ClientSession) {
    return ContractModel.findOne({ studentId: id, status: "ACTIVE" })
      .session(s ?? null)
      .exec();
  }
  findPendingOrActiveByStudentId(id: string, s?: ClientSession) {
    return ContractModel.findOne({
      studentId: id,
      status: { $in: ["PENDING", "ACTIVE"] },
    })
      .session(s ?? null)
      .exec();
  }
  findActiveByBedId(id: string, s?: ClientSession) {
    return ContractModel.findOne({ bedId: id, status: "ACTIVE" })
      .session(s ?? null)
      .exec();
  }
  findPendingByBedId(id: string, s?: ClientSession) {
    return ContractModel.find({ bedId: id, status: "PENDING" })
      .session(s ?? null)
      .exec();
  }
  async create(d: CreateContractData, s?: ClientSession) {
    const [x] = await ContractModel.create([d], { session: s });
    return x!;
  }
  updateStatus(
    id: string,
    status: ContractStatus,
    extra: Partial<ContractStatusMetadata> = {},
    s?: ClientSession,
  ) {
    return ContractModel.findByIdAndUpdate(
      id,
      { status, ...extra },
      { new: true, runValidators: true, session: s },
    ).exec();
  }
  async rejectPendingByBedIdExcept(
    bedId: string,
    exceptId: string,
    reason: string,
    s?: ClientSession,
  ) {
    const r = await ContractModel.updateMany(
      { bedId, status: "PENDING", _id: { $ne: exceptId } },
      { status: "REJECTED", rejectReason: reason },
      { session: s },
    );
    return r.modifiedCount;
  }
}
