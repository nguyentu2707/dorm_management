import { BedModel } from "../../models/bed.model.js";
import type { IBedRepository } from "../interfaces/bed.repository.interface.js";
import { Types, type ClientSession } from "mongoose";
export class BedRepository implements IBedRepository {
  async summarizeByRoomIds(ids: string[]) {
    const rows = await BedModel.aggregate([
      { $match: { roomId: { $in: ids.map((id) => new Types.ObjectId(id)) } } },
      {
        $group: {
          _id: "$roomId",
          total: { $sum: 1 },
          occupied: {
            $sum: { $cond: [{ $eq: ["$status", "OCCUPIED"] }, 1, 0] },
          },
          empty: { $sum: { $cond: [{ $eq: ["$status", "EMPTY"] }, 1, 0] } },
        },
      },
    ]);
    return new Map(
      rows.map((row) => [
        row._id.toString(),
        { total: row.total, occupied: row.occupied, empty: row.empty },
      ]),
    );
  }
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
  async ensureCapacity(id: string, count: number, s?: ClientSession) {
    const existing = new Set(
      (await this.findByRoomId(id, s)).map((bed) => bed.bedNumber),
    );
    const missing = Array.from({ length: count }, (_, i) => String(i + 1))
      .filter((bedNumber) => !existing.has(bedNumber))
      .map((bedNumber) => ({ roomId: id, bedNumber, status: "EMPTY" as const }));
    if (!missing.length) return 0;
    await BedModel.insertMany(missing, { session: s });
    return missing.length;
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
