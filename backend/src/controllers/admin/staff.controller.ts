import type { RequestHandler } from "express";
import type { AuthRequest } from "../../types/common.types.js";
import { paginationFrom } from "../../types/common.types.js";
import { auditContextFrom } from "../../utils/audit-context.js";
import type { StaffService } from "../../services/admin/staff.service.js";
export class StaffController {
  constructor(private service: StaffService) {}
  list: RequestHandler = async (req, res, next) => {
    try {
      res.json({
        success: true,
        message: "Danh sách nhân viên",
        data: await this.service.list({
          ...paginationFrom(
            Number(req.query.page) || 1,
            Number(req.query.limit) || 20,
          ),
          search: req.query.search as string | undefined,
          status: req.query.status as "ACTIVE" | "INACTIVE" | undefined,
        }),
      });
    } catch (e) {
      next(e);
    }
  };
  get: RequestHandler = async (req, res, next) => {
    try {
      res.json({
        success: true,
        message: "Chi tiết nhân viên",
        data: await this.service.get(req.params.staffId!),
      });
    } catch (e) {
      next(e);
    }
  };
  create: RequestHandler = async (req: AuthRequest, res, next) => {
    try {
      res
        .status(201)
        .json({
          success: true,
          message: "Đã tạo nhân viên",
          data: await this.service.create(req.body, auditContextFrom(req)),
        });
    } catch (e) {
      next(e);
    }
  };
  update: RequestHandler = async (req: AuthRequest, res, next) => {
    try {
      res.json({
        success: true,
        message: "Đã cập nhật nhân viên",
        data: await this.service.update(
          req.params.staffId!,
          req.body,
          auditContextFrom(req),
        ),
      });
    } catch (e) {
      next(e);
    }
  };
  status: RequestHandler = async (req: AuthRequest, res, next) => {
    try {
      res.json({
        success: true,
        message: "Đã cập nhật trạng thái nhân viên",
        data: await this.service.status(
          req.params.staffId!,
          req.body.status,
          auditContextFrom(req),
        ),
      });
    } catch (e) {
      next(e);
    }
  };
}
