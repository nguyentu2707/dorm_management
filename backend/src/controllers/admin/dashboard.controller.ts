import type { RequestHandler } from "express";
import type { AdminDashboardService } from "../../services/admin/dashboard.service.js";
export class AdminDashboardController {
  constructor(private service: AdminDashboardService) {}
  summary: RequestHandler = async (_req, res, next) => {
    try {
      res.json({
        success: true,
        message: "Tổng quan quản trị",
        data: await this.service.summary(),
      });
    } catch (error) {
      next(error);
    }
  };
  trends: RequestHandler = async (req, res, next) => {
    try {
      res.json({
        success: true,
        message: "Xu hướng quản trị",
        data: await this.service.trends(Number(req.query.months)),
      });
    } catch (error) {
      next(error);
    }
  };
}
