import type {
  IEquipmentItemRepository,
  EquipmentItemData,
} from "../../repositories/interfaces/equipment-item.repository.interface.js";
import type { IEquipmentCategoryRepository } from "../../repositories/interfaces/equipment-category.repository.interface.js";
import type { IRoomRepository } from "../../repositories/interfaces/room.repository.interface.js";
import type { EquipmentCondition } from "../../models/equipment-item.model.js";
import { AppError } from "../../errors/AppError.js";
import { EntityMapper } from "../../mappers/entity.mapper.js";
export class EquipmentItemService {
  constructor(
    private repo: IEquipmentItemRepository,
    private categories: IEquipmentCategoryRepository,
    private rooms: IRoomRepository,
  ) {}
  async list(roomId: string, page: number, limit: number) {
    if (!(await this.rooms.findById(roomId)))
      throw new AppError(404, "ROOM_NOT_FOUND", "Không tìm thấy phòng");
    const r = await this.repo.findByRoomId(roomId, page, limit);
    return { ...r, items: r.items.map(EntityMapper.toResponse) };
  }
  async get(id: string) {
    const x = await this.repo.findById(id);
    if (!x)
      throw new AppError(404, "EQUIPMENT_NOT_FOUND", "Không tìm thấy thiết bị");
    return EntityMapper.toResponse(x);
  }
  async create(d: EquipmentItemData) {
    if (!(await this.rooms.findById(d.roomId)))
      throw new AppError(404, "ROOM_NOT_FOUND", "Không tìm thấy phòng");
    if (!(await this.categories.findById(d.categoryId)))
      throw new AppError(
        404,
        "EQUIPMENT_CATEGORY_NOT_FOUND",
        "Không tìm thấy loại thiết bị",
      );
    return EntityMapper.toResponse(await this.repo.create(d));
  }
  async update(id: string, d: Partial<Omit<EquipmentItemData, "roomId">>) {
    if (d.categoryId && !(await this.categories.findById(d.categoryId)))
      throw new AppError(
        404,
        "EQUIPMENT_CATEGORY_NOT_FOUND",
        "Không tìm thấy loại thiết bị",
      );
    const x = await this.repo.update(id, d);
    if (!x)
      throw new AppError(404, "EQUIPMENT_NOT_FOUND", "Không tìm thấy thiết bị");
    return EntityMapper.toResponse(x);
  }
  async condition(id: string, c: EquipmentCondition) {
    const x = await this.repo.updateCondition(id, c);
    if (!x)
      throw new AppError(404, "EQUIPMENT_NOT_FOUND", "Không tìm thấy thiết bị");
    return EntityMapper.toResponse(x);
  }
  async delete(id: string) {
    if (!(await this.repo.findById(id)))
      throw new AppError(404, "EQUIPMENT_NOT_FOUND", "Không tìm thấy thiết bị");
    await this.repo.deleteById(id);
  }
}
