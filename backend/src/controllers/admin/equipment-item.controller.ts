import type { RequestHandler } from "express";
import type { EquipmentItemService } from "../../services/admin/equipment-item.service.js";
import { paginationFrom } from "../../types/common.types.js";
export class EquipmentItemController {
  constructor(private s: EquipmentItemService) {}
  list: RequestHandler = async (q, r, n) => {
    try {
      const p = paginationFrom(
        Number(q.query.page) || 1,
        Number(q.query.limit) || 20,
      );
      r.json({
        success: true,
        message: "Danh sách thiết bị",
        data: await this.s.list(q.params.roomId!, p.page, p.limit),
      });
    } catch (e) {
      n(e);
    }
  };
  get: RequestHandler = async (q, r, n) => {
    try {
      r.json({
        success: true,
        message: "Chi tiết thiết bị",
        data: await this.s.get(q.params.equipmentId!),
      });
    } catch (e) {
      n(e);
    }
  };
  create: RequestHandler = async (q, r, n) => {
    try {
      r.status(201).json({
        success: true,
        message: "Tạo thiết bị thành công",
        data: await this.s.create({ ...q.body, roomId: q.params.roomId }),
      });
    } catch (e) {
      n(e);
    }
  };
  update: RequestHandler = async (q, r, n) => {
    try {
      r.json({
        success: true,
        message: "Cập nhật thiết bị thành công",
        data: await this.s.update(q.params.equipmentId!, q.body),
      });
    } catch (e) {
      n(e);
    }
  };
  condition: RequestHandler = async (q, r, n) => {
    try {
      r.json({
        success: true,
        message: "Cập nhật tình trạng thiết bị thành công",
        data: await this.s.condition(q.params.equipmentId!, q.body.condition),
      });
    } catch (e) {
      n(e);
    }
  };
  delete: RequestHandler = async (q, r, n) => {
    try {
      await this.s.delete(q.params.equipmentId!);
      r.json({ success: true, message: "Xóa thiết bị thành công", data: {} });
    } catch (e) {
      n(e);
    }
  };
}
