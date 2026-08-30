import { RoomModel, type RoomStatus } from "../../models/room.model.js";
import type {
  IRoomRepository,
  RoomData,
  RoomListQuery,
} from "../interfaces/room.repository.interface.js";
import type { ClientSession, FilterQuery } from "mongoose";
import type { Room } from "../../models/room.model.js";
export class RoomRepository implements IRoomRepository {
  findById(id: string, s?: ClientSession) {
    return RoomModel.findById(id)
      .session(s ?? null)
      .exec();
  }
  async findByBuildingId(id: string, q: RoomListQuery) {
    const f: FilterQuery<Room> = { buildingId: id };
    if (q.search) f.roomNumber = { $regex: q.search, $options: "i" };
    if (q.status) f.status = q.status;
    if (q.roomTypeId) f.roomTypeId = q.roomTypeId;
    if (q.floor !== undefined) f.floor = q.floor;
    const [items, total] = await Promise.all([
      RoomModel.find(f)
        .skip((q.page - 1) * q.limit)
        .limit(q.limit)
        .sort({ floor: 1, roomNumber: 1 }),
      RoomModel.countDocuments(f),
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
  findByRoomNumberAndBuildingId(n: string, b: string) {
    return RoomModel.findOne({ roomNumber: n, buildingId: b }).exec();
  }
  countByBuildingId(id: string) {
    return RoomModel.countDocuments({ buildingId: id });
  }
  countByRoomTypeId(id: string) {
    return RoomModel.countDocuments({ roomTypeId: id });
  }
  async create(d: RoomData, s?: ClientSession) {
    const [x] = await RoomModel.create([d], { session: s });
    return x!;
  }
  update(
    id: string,
    d: Partial<Omit<RoomData, "buildingId">>,
    s?: ClientSession,
  ) {
    return RoomModel.findByIdAndUpdate(id, d, {
      new: true,
      runValidators: true,
      session: s,
    }).exec();
  }
  updateStatus(id: string, status: RoomStatus, s?: ClientSession) {
    return RoomModel.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true, session: s },
    ).exec();
  }
  async deleteById(id: string, s?: ClientSession) {
    await RoomModel.findByIdAndDelete(id, { session: s });
  }
}
