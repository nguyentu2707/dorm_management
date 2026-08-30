import { RoomTypeModel } from "../../models/room-type.model.js";
import type {
  IRoomTypeRepository,
  RoomTypeData,
} from "../interfaces/room-type.repository.interface.js";
import type { ClientSession } from "mongoose";
export class RoomTypeRepository implements IRoomTypeRepository {
  findAll() {
    return RoomTypeModel.find().sort({ name: 1 }).exec();
  }
  findById(id: string) {
    return RoomTypeModel.findById(id).exec();
  }
  async create(d: RoomTypeData, s?: ClientSession) {
    const [x] = await RoomTypeModel.create([d], { session: s });
    return x!;
  }
  update(id: string, d: Partial<RoomTypeData>, s?: ClientSession) {
    return RoomTypeModel.findByIdAndUpdate(id, d, {
      new: true,
      runValidators: true,
      session: s,
    }).exec();
  }
  async deleteById(id: string, s?: ClientSession) {
    await RoomTypeModel.findByIdAndDelete(id, { session: s });
  }
}
