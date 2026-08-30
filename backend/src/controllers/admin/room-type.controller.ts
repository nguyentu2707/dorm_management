import type { RequestHandler } from "express";
import type { RoomTypeService } from "../../services/admin/room-type.service.js";
export class RoomTypeController {
  constructor(private s: RoomTypeService) {}
  list: RequestHandler = async (_q, r, n) => {
    try {
      r.json({
        success: true,
        message: "Danh sách loại phòng",
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
        message: "Chi tiết loại phòng",
        data: await this.s.get(q.params.roomTypeId!),
      });
    } catch (e) {
      n(e);
    }
  };
  create: RequestHandler = async (q, r, n) => {
    try {
      r.status(201).json({
        success: true,
        message: "Tạo loại phòng thành công",
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
        message: "Cập nhật loại phòng thành công",
        data: await this.s.update(q.params.roomTypeId!, q.body),
      });
    } catch (e) {
      n(e);
    }
  };
  delete: RequestHandler = async (q, r, n) => {
    try {
      await this.s.delete(q.params.roomTypeId!);
      r.json({ success: true, message: "Xóa loại phòng thành công", data: {} });
    } catch (e) {
      n(e);
    }
  };
}
