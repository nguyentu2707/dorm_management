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
import type { AuditContext } from "../../models/audit-log.model.js";
import type { AuditLogService } from "../audit-log.service.js";
export class RoomService {
  constructor(
    private rooms: IRoomRepository,
    private buildings: IBuildingRepository,
    private types: IRoomTypeRepository,
    private beds: IBedRepository,
    private equipment: IEquipmentItemRepository,
    private tx: ITransactionManager,
    private audit?: AuditLogService,
  ) {}
  async list(buildingId: string, q: RoomListQuery) {
    if (!(await this.buildings.findById(buildingId)))
      throw new AppError(404, "BUILDING_NOT_FOUND", "Không tìm thấy tòa nhà");
    const r = await this.rooms.findByBuildingId(buildingId, q);
    const summaries = await this.beds.summarizeByRoomIds(
      r.items.map((room) => room.id),
    );
    return {
      ...r,
      items: r.items.map((room) => ({
        ...EntityMapper.toResponse(room),
        occupancy: summaries.get(room.id) ?? {
          total: 0,
          occupied: 0,
          empty: 0,
        },
      })),
    };
  }
  async get(id: string) {
    const x = await this.rooms.findById(id);
    if (!x) throw new AppError(404, "ROOM_NOT_FOUND", "Không tìm thấy phòng");
    return EntityMapper.toResponse(x);
  }
  async create(d: RoomData) {
    const room = await this.tx.runInTransaction(async (s) => {
      if (!(await this.buildings.findById(d.buildingId, s)))
        throw new AppError(404, "BUILDING_NOT_FOUND", "Không tìm thấy tòa nhà");
      // Serialize room creation with capacity edits of the selected type.
      const type = await this.types.findByIdForUpdate(d.roomTypeId, s);
      if (!type)
        throw new AppError(
          404,
          "ROOM_TYPE_NOT_FOUND",
          "Không tìm thấy loại phòng",
        );
      const r = await this.rooms.create(d, s);
      const createdBeds = await this.beds.createMany(r.id, type.capacity, s);
      if (createdBeds.length !== type.capacity)
        throw new AppError(
          409,
          "ROOM_BED_CAPACITY_INCONSISTENT",
          "Không thể tạo đủ giường theo sức chứa loại phòng",
        );
      return r;
    });
    return EntityMapper.toResponse(room);
  }
  async update(
    id: string,
    d: Partial<Omit<RoomData, "buildingId">>,
    context?: AuditContext,
  ) {
    const x = await this.tx.runInTransaction(async (s) => {
      const current = await this.rooms.findById(id, s);
      if (!current)
        throw new AppError(404, "ROOM_NOT_FOUND", "Không tìm thấy phòng");
      if (d.roomTypeId && d.roomTypeId !== current.roomTypeId) {
        // Lock the target type so its capacity cannot change between validation
        // and the room update. Capacity edits use the same row lock.
        const target = await this.types.findByIdForUpdate(d.roomTypeId, s);
        if (!target)
          throw new AppError(
            404,
            "ROOM_TYPE_NOT_FOUND",
            "Không tìm thấy loại phòng",
          );
        const currentType = await this.types.findById(current.roomTypeId, s);
        if (!currentType)
          throw new AppError(
            409,
            "ROOM_BED_CAPACITY_INCONSISTENT",
            "Loại phòng hiện tại không còn tồn tại",
          );
        const actualBeds = (await this.beds.findByRoomId(id, s)).length;
        if (
          currentType.capacity !== target.capacity ||
          actualBeds !== currentType.capacity
        )
          throw new AppError(
            409,
            "ROOM_TYPE_CAPACITY_MISMATCH",
            "Chỉ có thể đổi sang loại phòng có cùng sức chứa và khớp số giường hiện có",
          );
      }
      const updated = (await this.rooms.update(id, d, s))!;
      if (
        this.audit &&
        context &&
        d.roomTypeId &&
        d.roomTypeId !== current.roomTypeId
      )
        await this.audit.record(
          {
            action: "ROOM_TYPE_CHANGED",
            entityType: "ROOM",
            entityId: id,
            oldData: { roomTypeId: current.roomTypeId },
            newData: { roomTypeId: updated.roomTypeId },
          },
          context,
          s,
        );
      return updated;
    });
    return EntityMapper.toResponse(x);
  }
  async status(id: string, status: RoomStatus, context?: AuditContext) {
    if (this.audit && context)
      return this.tx.runInTransaction(async (tx) => {
        const old = await this.rooms.findById(id, tx);
        if (!old)
          throw new AppError(404, "ROOM_NOT_FOUND", "Không tìm thấy phòng");
        const item = (await this.rooms.updateStatus(id, status, tx))!;
        if (old.status !== status)
          await this.audit!.record(
            {
              action: "ROOM_STATUS_CHANGED",
              entityType: "ROOM",
              entityId: id,
              oldData: { status: old.status },
              newData: { status },
            },
            context,
            tx,
          );
        return EntityMapper.toResponse(item);
      });
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
    await this.tx.runInTransaction(async (session) => {
      await this.beds.deleteByRoomId(id, session);
      await this.rooms.deleteById(id, session);
    });
  }
}
