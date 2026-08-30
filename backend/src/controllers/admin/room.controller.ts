import type { RequestHandler } from "express";
import type { RoomService } from "../../services/admin/room.service.js";
import { paginationFrom } from "../../types/common.types.js";
export class RoomController {
  constructor(private s: RoomService) {}
  list: RequestHandler = async (q, r, n) => {
    try {
      const p = paginationFrom(
        Number(q.query.page) || 1,
        Number(q.query.limit) || 20,
      );
      r.json({
        success: true,
        message: "Danh sách phòng",
        data: await this.s.list(q.params.buildingId!, {
          ...p,
          search: q.query.search as string | undefined,
          status: q.query.status as never,
          roomTypeId: q.query.roomTypeId as string | undefined,
          floor:
            q.query.floor === undefined ? undefined : Number(q.query.floor),
        }),
      });
    } catch (e) {
      n(e);
    }
  };
  get: RequestHandler = async (q, r, n) => {
    try {
      r.json({
        success: true,
        message: "Chi tiết phòng",
        data: await this.s.get(q.params.roomId!),
      });
    } catch (e) {
      n(e);
    }
  };
  create: RequestHandler = async (q, r, n) => {
    try {
      r.status(201).json({
        success: true,
        message: "Tạo phòng thành công",
        data: await this.s.create({
          ...q.body,
          buildingId: q.params.buildingId,
        }),
      });
    } catch (e) {
      n(e);
    }
  };
  update: RequestHandler = async (q, r, n) => {
    try {
      r.json({
        success: true,
        message: "Cập nhật phòng thành công",
        data: await this.s.update(q.params.roomId!, q.body),
      });
    } catch (e) {
      n(e);
    }
  };
  status: RequestHandler = async (q, r, n) => {
    try {
      r.json({
        success: true,
        message: "Cập nhật trạng thái phòng thành công",
        data: await this.s.status(q.params.roomId!, q.body.status),
      });
    } catch (e) {
      n(e);
    }
  };
  delete: RequestHandler = async (q, r, n) => {
    try {
      await this.s.delete(q.params.roomId!);
      r.json({ success: true, message: "Xóa phòng thành công", data: {} });
    } catch (e) {
      n(e);
    }
  };
}
