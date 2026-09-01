import type { RequestHandler } from "express";
import type { AuthRequest } from "../../types/common.types.js";
import type { NotificationService } from "../../services/notification.service.js";
export class StudentNotificationController {
  constructor(private service: NotificationService) {}
  mine: RequestHandler = async (req: AuthRequest, res, next) => {
    try {
      res.json({
        success: true,
        message: "Thông báo của tôi",
        data: await this.service.mine(req.user!.userId, req.query as never),
      });
    } catch (e) {
      next(e);
    }
  };
  detail: RequestHandler = async (req: AuthRequest, res, next) => {
    try {
      res.json({
        success: true,
        message: "Chi tiết thông báo",
        data: await this.service.studentDetail(
          req.user!.userId,
          req.params.notificationId!,
        ),
      });
    } catch (e) {
      next(e);
    }
  };
  read: RequestHandler = async (req: AuthRequest, res, next) => {
    try {
      res.json({
        success: true,
        message: "Đã đánh dấu đã đọc",
        data: await this.service.markRead(
          req.user!.userId,
          req.params.notificationId!,
        ),
      });
    } catch (e) {
      next(e);
    }
  };
  unread: RequestHandler = async (req: AuthRequest, res, next) => {
    try {
      res.json({
        success: true,
        message: "Số thông báo chưa đọc",
        data: await this.service.unreadCount(req.user!.userId),
      });
    } catch (e) {
      next(e);
    }
  };
}
