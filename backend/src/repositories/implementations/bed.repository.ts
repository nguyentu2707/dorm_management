import { BedModel } from "../../models/bed.model.js";
import type { IBedRepository } from "../interfaces/bed.repository.interface.js";
import type { ClientSession } from "mongoose";
export class BedRepository implements IBedRepository {
  findById(id: string, s?: ClientSession) {
    return BedModel.findById(id)
      .session(s ?? null)
      .exec();
  }
  findByRoomId(id: string, s?: ClientSession) {
    return BedModel.find({ roomId: id })
      .session(s ?? null)
      .sort({ bedNumber: 1 })
      .exec();
  }
  async createMany(id: string, count: number, s?: ClientSession) {
    return BedModel.insertMany(
      Array.from({ length: count }, (_, i) => ({
        roomId: id,
        bedNumber: String(i + 1),
        status: "EMPTY",
      })),
      { session: s },
    );
  }
  countOccupiedByRoomId(id: string, s?: ClientSession) {
    return BedModel.countDocuments({ roomId: id, status: "OCCUPIED" }).session(
      s ?? null,
    );
  }
  countEmptyByRoomId(id: string, s?: ClientSession) {
    return BedModel.countDocuments({ roomId: id, status: "EMPTY" }).session(
      s ?? null,
    );
  }
  async occupyIfEmpty(id: string, s?: ClientSession) {
    return (
      (await BedModel.findOneAndUpdate(
        { _id: id, status: "EMPTY" },
        { status: "OCCUPIED" },
        { new: true, session: s },
      )) !== null
    );
  }
  async releaseIfOccupied(id: string, s?: ClientSession) {
    return (
      (await BedModel.findOneAndUpdate(
        { _id: id, status: "OCCUPIED" },
        { status: "EMPTY" },
        { new: true, session: s },
      )) !== null
    );
  }
  async deleteByRoomId(id: string, s?: ClientSession) {
    await BedModel.deleteMany({ roomId: id }, { session: s });
  }
}
