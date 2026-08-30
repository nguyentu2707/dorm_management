import type { RequestHandler } from "express";
import type { BuildingService } from "../../services/admin/building.service.js";
export class BuildingController {
  constructor(private s: BuildingService) {}
  list: RequestHandler = async (_q, r, n) => {
    try {
      r.json({
        success: true,
        message: "Danh sách tòa nhà",
        data: await this.s.list(),
      });
    } catch (e) {
      n(e);
    }
  };
  get: RequestHandler = async (q, r, n) => {
    try {
      r.json({
        success: true,
        message: "Chi tiết tòa nhà",
        data: await this.s.get(q.params.buildingId!),
      });
    } catch (e) {
      n(e);
    }
  };
  create: RequestHandler = async (q, r, n) => {
    try {
      r.status(201).json({
        success: true,
        message: "Tạo tòa nhà thành công",
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
        message: "Cập nhật tòa nhà thành công",
        data: await this.s.update(q.params.buildingId!, q.body),
      });
    } catch (e) {
      n(e);
    }
  };
  delete: RequestHandler = async (q, r, n) => {
    try {
      await this.s.delete(q.params.buildingId!);
      r.json({ success: true, message: "Xóa tòa nhà thành công", data: {} });
    } catch (e) {
      n(e);
    }
  };
}
