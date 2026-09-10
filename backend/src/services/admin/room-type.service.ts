import type {
  IRoomTypeRepository,
  RoomTypeData,
} from "../../repositories/interfaces/room-type.repository.interface.js";
import type { IRoomRepository } from "../../repositories/interfaces/room.repository.interface.js";
import { AppError } from "../../errors/AppError.js";
import { EntityMapper } from "../../mappers/entity.mapper.js";
import type { ITransactionManager } from "../transaction-manager.js";
export class RoomTypeService {
  constructor(
    private repo: IRoomTypeRepository,
    private rooms: IRoomRepository,
    private tx: ITransactionManager,
  ) {}
  async list() {
    return (await this.repo.findAll()).map(EntityMapper.toResponse);
  }
  async get(id: string) {
    const x = await this.repo.findById(id);
    if (!x)
      throw new AppError(
        404,
        "ROOM_TYPE_NOT_FOUND",
        "Không tìm thấy loại phòng",
      );
    return EntityMapper.toResponse(x);
  }
  async create(d: RoomTypeData) {
    return EntityMapper.toResponse(await this.repo.create(d));
  }
  async update(id: string, d: Partial<RoomTypeData>) {
    return this.tx.runInTransaction(async (s) => {
      const old = await this.repo.findByIdForUpdate(id, s);
      if (!old)
        throw new AppError(
          404,
          "ROOM_TYPE_NOT_FOUND",
          "Không tìm thấy loại phòng",
        );
      if (
        d.capacity !== undefined &&
        d.capacity !== old.capacity &&
        (await this.rooms.countByRoomTypeId(id, s))
      )
        throw new AppError(
          409,
          "ROOM_TYPE_CAPACITY_IN_USE",
          "Không thể đổi sức chứa của loại phòng đang được sử dụng",
        );
      return EntityMapper.toResponse((await this.repo.update(id, d, s))!);
    });
  }
  async delete(id: string) {
    if (!(await this.repo.findById(id)))
      throw new AppError(
        404,
        "ROOM_TYPE_NOT_FOUND",
        "Không tìm thấy loại phòng",
      );
    if (await this.rooms.countByRoomTypeId(id))
      throw new AppError(
        409,
        "ROOM_TYPE_IS_USED",
        "Loại phòng đang được sử dụng",
      );
    await this.repo.deleteById(id);
  }
}
