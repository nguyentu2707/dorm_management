import { RoomPreferenceModel } from "../../models/room-preference.model.js";
import type { IRoomPreferenceRepository, RoomPreferenceData } from "../interfaces/room-preference.repository.interface.js";
export class RoomPreferenceRepository implements IRoomPreferenceRepository {
  findByStudentId(id: string) { return RoomPreferenceModel.findOne({ studentId: id }).exec(); }
  upsert(id: string, data: RoomPreferenceData) {
    return RoomPreferenceModel.findOneAndUpdate({ studentId: id }, { $set: data }, { upsert: true, new: true, runValidators: true }).exec();
  }
  async deleteByStudentId(id: string) { await RoomPreferenceModel.deleteOne({ studentId: id }); }
}
