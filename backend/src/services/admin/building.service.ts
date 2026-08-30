import type {
  IBuildingRepository,
  BuildingData,
} from "../../repositories/interfaces/building.repository.interface.js";
import type { IRoomRepository } from "../../repositories/interfaces/room.repository.interface.js";
import { AppError } from "../../errors/AppError.js";
import { EntityMapper } from "../../mappers/entity.mapper.js";
export class BuildingService {
  constructor(
    private repo: IBuildingRepository,
    private rooms: IRoomRepository,
  ) {}
  async list() {
    return (await this.repo.findAll()).map(EntityMapper.toResponse);
  }
  async get(id: string) {
    const x = await this.repo.findById(id);
    if (!x)
      throw new AppError(404, "BUILDING_NOT_FOUND", "Không tìm thấy tòa nhà");
    return EntityMapper.toResponse(x);
  }
  async create(d: BuildingData) {
    return EntityMapper.toResponse(await this.repo.create(d));
  }
  async update(id: string, d: Partial<BuildingData>) {
    const x = await this.repo.update(id, d);
    if (!x)
      throw new AppError(404, "BUILDING_NOT_FOUND", "Không tìm thấy tòa nhà");
    return EntityMapper.toResponse(x);
  }
  async delete(id: string) {
    if (!(await this.repo.findById(id)))
      throw new AppError(404, "BUILDING_NOT_FOUND", "Không tìm thấy tòa nhà");
    if (await this.rooms.countByBuildingId(id))
      throw new AppError(409, "BUILDING_HAS_ROOMS", "Tòa nhà vẫn còn phòng");
    await this.repo.deleteById(id);
  }
}
