import type {
  IRoomRepository,
  RoomData,
  RoomListQuery,
} from "../../repositories/interfaces/room.repository.interface.js";
import type { IBuildingRepository } from "../../repositories/interfaces/building.repository.interface.js";
import type { IRoomTypeRepository } from "../../repositories/interfaces/room-type.repository.interface.js";
import type { IBedRepository } from "../../repositories/interfaces/bed.repository.interface.js";
import type { IEquipmentItemRepository } from "../../repositories/interfaces/equipment-item.repository.interface.js";
import type { ITransactionManager } from "../transaction-manager.js";
import type { RoomStatus } from "../../models/room.model.js";
import { AppError } from "../../errors/AppError.js";
import { EntityMapper } from "../../mappers/entity.mapper.js";
export class RoomService {
  constructor(
    private rooms: IRoomRepository,
    private buildings: IBuildingRepository,
    private types: IRoomTypeRepository,
    private beds: IBedRepository,
    private equipment: IEquipmentItemRepository,
    private tx: ITransactionManager,
  ) {}
  async list(buildingId: string, q: RoomListQuery) {
    if (!(await this.buildings.findById(buildingId)))
      throw new AppError(404, "BUILDING_NOT_FOUND", "Không tìm thấy tòa nhà");
    const r = await this.rooms.findByBuildingId(buildingId, q);
    return { ...r, items: r.items.map(EntityMapper.toResponse) };
  }
  async get(id: string) {
    const x = await this.rooms.findById(id);
    if (!x) throw new AppError(404, "ROOM_NOT_FOUND", "Không tìm thấy phòng");
    return EntityMapper.toResponse(x);
  }
  async create(d: RoomData) {
    if (!(await this.buildings.findById(d.buildingId)))
      throw new AppError(404, "BUILDING_NOT_FOUND", "Không tìm thấy tòa nhà");
    const type = await this.types.findById(d.roomTypeId);
    if (!type)
      throw new AppError(
        404,
        "ROOM_TYPE_NOT_FOUND",
        "Không tìm thấy loại phòng",
      );
    try {
      const room = await this.tx.runInTransaction(async (s) => {
        const r = await this.rooms.create(d, s);
        await this.beds.createMany(r._id.toString(), type.capacity, s);
        return r;
      });
      return EntityMapper.toResponse(room);
    } catch (error) {
      if (!this.transactionUnsupported(error)) throw error;
      const room = await this.rooms.create(d);
      try {
        await this.beds.createMany(room._id.toString(), type.capacity);
        return EntityMapper.toResponse(room);
      } catch (bedError) {
        await this.beds.deleteByRoomId(room._id.toString());
        await this.rooms.deleteById(room._id.toString());
        throw bedError;
      }
    }
  }
  private transactionUnsupported(error: unknown) {
    const message = error instanceof Error ? error.message : "";
    return /Transaction numbers are only allowed|replica set|mongos/i.test(
      message,
    );
  }
  async update(id: string, d: Partial<Omit<RoomData, "buildingId">>) {
    if (d.roomTypeId && !(await this.types.findById(d.roomTypeId)))
      throw new AppError(
        404,
        "ROOM_TYPE_NOT_FOUND",
        "Không tìm thấy loại phòng",
      );
    const x = await this.rooms.update(id, d);
    if (!x) throw new AppError(404, "ROOM_NOT_FOUND", "Không tìm thấy phòng");
    return EntityMapper.toResponse(x);
  }
  async status(id: string, status: RoomStatus) {
    const x = await this.rooms.updateStatus(id, status);
    if (!x) throw new AppError(404, "ROOM_NOT_FOUND", "Không tìm thấy phòng");
    return EntityMapper.toResponse(x);
  }
  async delete(id: string) {
    if (!(await this.rooms.findById(id)))
      throw new AppError(404, "ROOM_NOT_FOUND", "Không tìm thấy phòng");
    if (await this.beds.countOccupiedByRoomId(id))
      throw new AppError(
        409,
        "ROOM_HAS_OCCUPIED_BEDS",
        "Phòng còn giường đang được sử dụng",
      );
    if (await this.equipment.countByRoomId(id))
      throw new AppError(409, "ROOM_HAS_EQUIPMENT", "Phòng còn thiết bị");
    await this.beds.deleteByRoomId(id);
    await this.rooms.deleteById(id);
  }
}
