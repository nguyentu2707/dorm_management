import type {
  IRoomTypeRepository,
  RoomTypeData,
} from "../../repositories/interfaces/room-type.repository.interface.js";
import type { IRoomRepository } from "../../repositories/interfaces/room.repository.interface.js";
import { AppError } from "../../errors/AppError.js";
import { EntityMapper } from "../../mappers/entity.mapper.js";
export class RoomTypeService {
  constructor(
    private repo: IRoomTypeRepository,
    private rooms: IRoomRepository,
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
    const old = await this.repo.findById(id);
    if (!old)
      throw new AppError(
        404,
        "ROOM_TYPE_NOT_FOUND",
        "Không tìm thấy loại phòng",
      );
    if (
      d.capacity !== undefined &&
      d.capacity !== old.capacity &&
      (await this.rooms.countByRoomTypeId(id))
    )
      throw new AppError(
        409,
        "ROOM_TYPE_CAPACITY_LOCKED",
        "Không thể đổi sức chứa của loại phòng đang được sử dụng",
      );
    return EntityMapper.toResponse((await this.repo.update(id, d))!);
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
