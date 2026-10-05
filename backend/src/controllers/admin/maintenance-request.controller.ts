import type { RequestHandler } from "express";
import type { MaintenanceRequestService } from "../../services/maintenance-request.service.js";
import type { AuthRequest } from "../../types/common.types.js";
import { auditContextFrom } from "../../utils/audit-context.js";
export class AdminMaintenanceRequestController {
  constructor(private s: MaintenanceRequestService) {}
  staff: RequestHandler = async (_q, r, n) => {
    try {
      r.json({
        success: true,
        message: "Danh sách nhân viên bảo trì",
        data: await this.s.maintenanceStaff(),
      });
    } catch (e) {
      n(e);
    }
  };
  list: RequestHandler = async (q, r, n) => {
    try {
      r.json({
        success: true,
        message: "Danh sách bảo trì",
        data: await this.s.list(q.query as never),
      });
    } catch (e) {
      n(e);
    }
  };
  detail: RequestHandler = async (q, r, n) => {
    try {
      r.json({
        success: true,
        message: "Chi tiết bảo trì",
        data: await this.s.detail(q.params.id!),
      });
    } catch (e) {
      n(e);
    }
  };
  assign: RequestHandler = async (q: AuthRequest, r, n) => {
    try {
      r.json({
        success: true,
        message: "Đã phân công",
        data: await this.s.assign(
          q.params.id!,
          q.body.staffId,
          auditContextFrom(q),
        ),
      });
    } catch (e) {
      n(e);
    }
  };
  resolve: RequestHandler = async (q: AuthRequest, r, n) => {
    try {
      r.json({
        success: true,
        message: "Đã xử lý",
        data: await this.s.resolve(q.params.id!, q.body, auditContextFrom(q)),
      });
    } catch (e) {
      n(e);
    }
  };
  cancel: RequestHandler = async (q: AuthRequest, r, n) => {
    try {
      r.json({
        success: true,
        message: "Đã hủy",
        data: await this.s.adminCancel(
          q.params.id!,
          q.body.reason,
          auditContextFrom(q),
        ),
      });
    } catch (e) {
      n(e);
    }
  };
}
