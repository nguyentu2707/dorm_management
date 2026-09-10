import type { RequestHandler } from "express";
import type { AuthRequest } from "../../types/common.types.js";
import type { MonthlyBillingService } from "../../services/monthly-billing.service.js";

export class AdminMonthlyBillingController {
  constructor(private service: MonthlyBillingService) {}
  saveDraft: RequestHandler = async (request, response, next) => {
    try {
      response.json({
        success: true,
        message: "Đã lưu kỳ hóa đơn nháp",
        data: await this.service.saveDraft(request.body),
      });
    } catch (error) {
      next(error);
    }
  };
  preview: RequestHandler = async (request, response, next) => {
    try {
      response.json({
        success: true,
        message: "Bản xem trước hóa đơn",
        data: await this.service.preview(request.params.billingId!),
      });
    } catch (error) {
      next(error);
    }
  };
  finalize: RequestHandler = async (request: AuthRequest, response, next) => {
    try {
      response.json({
        success: true,
        message: "Đã hoàn tất kỳ hóa đơn",
        data: await this.service.finalize(
          request.params.billingId!,
          request.user!.userId,
        ),
      });
    } catch (error) {
      next(error);
    }
  };
  cancel: RequestHandler = async (request: AuthRequest, response, next) => {
    try {
      response.json({
        success: true,
        message: "Đã hủy kỳ hóa đơn và các hóa đơn sinh viên",
        data: await this.service.cancel(
          request.params.billingId!,
          request.user!.userId,
          request.body.reason,
        ),
      });
    } catch (error) {
      next(error);
    }
  };
  list: RequestHandler = async (request, response, next) => {
    try {
      response.json({
        success: true,
        message: "Danh sách kỳ hóa đơn",
        data: await this.service.list(request.query as never),
      });
    } catch (error) {
      next(error);
    }
  };
  get: RequestHandler = async (request, response, next) => {
    try {
      response.json({
        success: true,
        message: "Chi tiết kỳ hóa đơn",
        data: await this.service.get(request.params.billingId!),
      });
    } catch (error) {
      next(error);
    }
  };
}
