import type { RequestHandler } from "express";
import type { AuthRequest } from "../../types/common.types.js";
import type { MaintenanceRequestService } from "../../services/maintenance-request.service.js";
export class StudentMaintenanceRequestController {
  constructor(private s: MaintenanceRequestService) {}
  create: RequestHandler = async (q: AuthRequest, r, n) => {
    try {
      r.status(201).json({
        success: true,
        message: "Tạo yêu cầu thành công",
        data: await this.s.create(q.user!.userId, q.body),
      });
    } catch (e) {
      n(e);
    }
  };
  mine: RequestHandler = async (q: AuthRequest, r, n) => {
    try {
      r.json({
        success: true,
        message: "Yêu cầu của tôi",
        data: await this.s.mine(q.user!.userId),
      });
    } catch (e) {
      n(e);
    }
  };
  equipment: RequestHandler = async (q: AuthRequest, r, n) => {
    try {
      r.json({
        success: true,
        message: "Thiết bị trong phòng",
        data: await this.s.equipmentMine(q.user!.userId),
      });
    } catch (e) {
      n(e);
    }
  };
  cancel: RequestHandler = async (q: AuthRequest, r, n) => {
    try {
      r.json({
        success: true,
        message: "Đã hủy yêu cầu",
        data: await this.s.studentCancel(
          q.user!.userId,
          q.params.id!,
          q.body.reason,
        ),
      });
    } catch (e) {
      n(e);
    }
  };
}
