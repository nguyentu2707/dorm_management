import type { ClientSession, FilterQuery } from "mongoose";
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
