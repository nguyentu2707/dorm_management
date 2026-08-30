import type { IBedRepository } from "../../repositories/interfaces/bed.repository.interface.js";
import type { IRoomRepository } from "../../repositories/interfaces/room.repository.interface.js";
import { AppError } from "../../errors/AppError.js";
import { EntityMapper } from "../../mappers/entity.mapper.js";
export class BedService {
  constructor(
    private beds: IBedRepository,
    private rooms: IRoomRepository,
  ) {}
  async list(roomId: string) {
    if (!(await this.rooms.findById(roomId)))
      throw new AppError(404, "ROOM_NOT_FOUND", "Không tìm thấy phòng");
    return (await this.beds.findByRoomId(roomId)).map(EntityMapper.toResponse);
  }
}
