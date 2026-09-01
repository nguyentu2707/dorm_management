import type { RequestHandler } from "express";
import type { AuthRequest } from "../../types/common.types.js";
import type { NotificationService } from "../../services/notification.service.js";
export class AdminNotificationController {
  constructor(private service: NotificationService) {}
  create: RequestHandler = async (req: AuthRequest, res, next) => {
    try {
      res.status(201).json({
        success: true,
        message: "Tạo thông báo thành công",
        data: await this.service.create(req.user!.userId, req.body),
      });
    } catch (e) {
      next(e);
    }
  };
  list: RequestHandler = async (req, res, next) => {
    try {
      res.json({
        success: true,
        message: "Danh sách thông báo",
        data: await this.service.listAdmin(req.query as never),
      });
    } catch (e) {
      next(e);
    }
  };
  detail: RequestHandler = async (req, res, next) => {
    try {
      res.json({
        success: true,
        message: "Chi tiết thông báo",
        data: await this.service.detailAdmin(req.params.notificationId!),
      });
    } catch (e) {
      next(e);
    }
  };
}
