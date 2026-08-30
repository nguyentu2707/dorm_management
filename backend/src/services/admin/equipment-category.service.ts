import type {
  IEquipmentCategoryRepository,
  EquipmentCategoryData,
} from "../../repositories/interfaces/equipment-category.repository.interface.js";
import type { IEquipmentItemRepository } from "../../repositories/interfaces/equipment-item.repository.interface.js";
import { AppError } from "../../errors/AppError.js";
import { EntityMapper } from "../../mappers/entity.mapper.js";
export class EquipmentCategoryService {
  constructor(
    private repo: IEquipmentCategoryRepository,
    private items: IEquipmentItemRepository,
  ) {}
  async list() {
    return (await this.repo.findAll()).map(EntityMapper.toResponse);
  }
  async create(d: EquipmentCategoryData) {
    return EntityMapper.toResponse(await this.repo.create(d));
  }
  async update(id: string, d: Partial<EquipmentCategoryData>) {
    const x = await this.repo.update(id, d);
    if (!x)
      throw new AppError(
        404,
        "EQUIPMENT_CATEGORY_NOT_FOUND",
        "Không tìm thấy loại thiết bị",
      );
    return EntityMapper.toResponse(x);
  }
  async delete(id: string) {
    if (!(await this.repo.findById(id)))
      throw new AppError(
        404,
        "EQUIPMENT_CATEGORY_NOT_FOUND",
        "Không tìm thấy loại thiết bị",
      );
    if (await this.items.countByCategoryId(id))
      throw new AppError(
        409,
        "EQUIPMENT_CATEGORY_IS_USED",
        "Loại thiết bị đang được sử dụng",
      );
    await this.repo.deleteById(id);
  }
}
