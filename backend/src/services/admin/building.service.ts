import type {
  IBuildingRepository,
  BuildingData,
} from "../../repositories/interfaces/building.repository.interface.js";
import type { IRoomRepository } from "../../repositories/interfaces/room.repository.interface.js";
import { AppError } from "../../errors/AppError.js";
import { EntityMapper } from "../../mappers/entity.mapper.js";
import type { AuditContext } from "../../models/audit-log.model.js";
import type { AuditLogService } from "../audit-log.service.js";
import type { ITransactionManager } from "../transaction-manager.js";
export class BuildingService {
  constructor(
    private repo: IBuildingRepository,
    private rooms: IRoomRepository,
    private tx: ITransactionManager,
    private audit?: AuditLogService,
  ) {}
  async list() {
    return (await this.repo.findAllWithSummaries()).map(
      EntityMapper.toResponse,
    );
  }
  async overview(id: string) {
    const building = await this.repo.findById(id);
    if (!building)
      throw new AppError(404, "BUILDING_NOT_FOUND", "Không tìm thấy tòa nhà");
    const rooms = await this.repo.findFloorRooms(id);
    const floors = [...new Set(rooms.map((room) => room.floor))]
      .sort((a, b) => b - a)
      .map((floor) => {
        const floorRooms = rooms.filter((room) => room.floor === floor);
        return {
          floor,
          roomCount: floorRooms.length,
          totalBeds: floorRooms.reduce((sum, room) => sum + room.totalBeds, 0),
          occupiedBeds: floorRooms.reduce(
            (sum, room) => sum + room.occupiedBeds,
            0,
          ),
          emptyBeds: floorRooms.reduce((sum, room) => sum + room.emptyBeds, 0),
          rooms: floorRooms,
        };
      });
    const totalBeds = floors.reduce((sum, floor) => sum + floor.totalBeds, 0);
    const occupiedBeds = floors.reduce(
      (sum, floor) => sum + floor.occupiedBeds,
      0,
    );
    return {
      building: EntityMapper.toResponse(building),
      summary: {
        floorCount: floors.length,
        roomCount: rooms.length,
        totalBeds,
        occupiedBeds,
        emptyBeds: totalBeds - occupiedBeds,
        occupancyPercent: totalBeds
          ? Math.round((occupiedBeds / totalBeds) * 100)
          : 0,
      },
      floors,
    };
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
  async update(id: string, d: Partial<BuildingData>, context?: AuditContext) {
    return this.tx.runInTransaction(async (tx) => {
      const old = await this.repo.findByIdForUpdate(id, tx);
      if (!old)
        throw new AppError(
          404,
          "BUILDING_NOT_FOUND",
          "Không tìm thấy tòa nhà",
        );
      const genderChanged =
        d.allowedGender !== undefined &&
        d.allowedGender !== old.allowedGender;
      if (
        genderChanged &&
        d.allowedGender !== "MIXED" &&
        (await this.repo.hasIncompatibleActiveResidents(
          id,
          d.allowedGender!,
          tx,
        ))
      )
        throw new AppError(
          409,
          "BUILDING_GENDER_CONFLICT_WITH_RESIDENTS",
          "Không thể đổi giới tính tòa nhà vì có sinh viên đang ở không phù hợp",
        );
      const item = (await this.repo.update(id, d, tx))!;
      if (
        this.audit &&
        context &&
        d.status !== undefined &&
        d.status !== old.status
      )
        await this.audit.record(
          {
            action: "BUILDING_STATUS_CHANGED",
            entityType: "BUILDING",
            entityId: id,
            oldData: { status: old.status },
            newData: { status: item.status },
          },
          context,
          tx,
        );
      if (this.audit && context && genderChanged)
        await this.audit.record(
          {
            action: "BUILDING_GENDER_CHANGED",
            entityType: "BUILDING",
            entityId: id,
            oldData: { allowedGender: old.allowedGender },
            newData: { allowedGender: item.allowedGender },
          },
          context,
          tx,
        );
      return EntityMapper.toResponse(item);
    });
  }
  async delete(id: string) {
    if (!(await this.repo.findById(id)))
      throw new AppError(404, "BUILDING_NOT_FOUND", "Không tìm thấy tòa nhà");
    if (await this.rooms.countByBuildingId(id))
      throw new AppError(409, "BUILDING_HAS_ROOMS", "Tòa nhà vẫn còn phòng");
    await this.repo.deleteById(id);
  }
}
