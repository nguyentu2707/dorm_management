import type { RequestHandler } from "express";
import type { AuditLogService } from "../../services/audit-log.service.js";
import { paginationFrom } from "../../types/common.types.js";
export class AuditLogController {
  constructor(private service: AuditLogService) {}
  list: RequestHandler = async (req, res, next) => {
    try {
      res.json({
        success: true,
        message: "Nhật ký hệ thống",
        data: await this.service.list({
          ...paginationFrom(
            Number(req.query.page) || 1,
            Number(req.query.limit) || 20,
          ),
          action: req.query.action as never,
          entityType: req.query.entityType as never,
          entityId: req.query.entityId as string | undefined,
          actorUserId: req.query.actorUserId as string | undefined,
          dateFrom: req.query.dateFrom
            ? new Date(req.query.dateFrom as string)
            : undefined,
          dateTo: req.query.dateTo
            ? new Date(req.query.dateTo as string)
            : undefined,
        }),
      });
    } catch (e) {
      next(e);
    }
  };
  detail: RequestHandler = async (req, res, next) => {
    try {
      res.json({
        success: true,
        message: "Chi tiết nhật ký",
        data: await this.service.detail(req.params.auditId!),
      });
    } catch (e) {
      next(e);
    }
  };
}
