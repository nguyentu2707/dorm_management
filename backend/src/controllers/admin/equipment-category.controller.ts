import type { RequestHandler } from "express";
import type { EquipmentCategoryService } from "../../services/admin/equipment-category.service.js";
export class EquipmentCategoryController {
  constructor(private s: EquipmentCategoryService) {}
  list: RequestHandler = async (_q, r, n) => {
    try {
      r.json({
        success: true,
        message: "Danh sách loại thiết bị",
        data: await this.s.list(),
      });
    } catch (e) {
      n(e);
    }
  };
  create: RequestHandler = async (q, r, n) => {
    try {
      r.status(201).json({
        success: true,
        message: "Tạo loại thiết bị thành công",
        data: await this.s.create(q.body),
      });
    } catch (e) {
      n(e);
    }
  };
  update: RequestHandler = async (q, r, n) => {
    try {
      r.json({
        success: true,
        message: "Cập nhật loại thiết bị thành công",
        data: await this.s.update(q.params.categoryId!, q.body),
      });
    } catch (e) {
      n(e);
    }
  };
  delete: RequestHandler = async (q, r, n) => {
    try {
      await this.s.delete(q.params.categoryId!);
      r.json({
        success: true,
        message: "Xóa loại thiết bị thành công",
        data: {},
      });
    } catch (e) {
      n(e);
    }
  };
}
