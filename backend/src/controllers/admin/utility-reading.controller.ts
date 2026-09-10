import type { RequestHandler } from "express";
import type { AuthRequest } from "../../types/common.types.js";
import type { UtilityReadingService } from "../../services/utility-reading.service.js";
export class AdminUtilityReadingController {
  constructor(private s: UtilityReadingService) {}
  create: RequestHandler = async (q: AuthRequest, r, n) => {
    try {
      r.status(201).json({
        success: true,
        message: "Tạo chỉ số thành công",
        data: await this.s.create(q.user!.userId, q.body),
      });
    } catch (e) {
      n(e);
    }
  };
  list: RequestHandler = async (q, r, n) => {
    try {
      r.json({
        success: true,
        message: "Danh sách chỉ số",
        data: await this.s.list(q.query as never),
      });
    } catch (e) {
      n(e);
    }
  };
  get: RequestHandler = async (q, r, n) => {
    try {
      r.json({
        success: true,
        message: "Chi tiết chỉ số",
        data: await this.s.get(q.params.readingId!),
      });
    } catch (e) {
      n(e);
    }
  };
  update: RequestHandler = async (q, r, n) => {
    try {
      r.json({
        success: true,
        message: "Cập nhật chỉ số thành công",
        data: await this.s.update(q.params.readingId!, q.body),
      });
    } catch (e) {
      n(e);
    }
  };
}
