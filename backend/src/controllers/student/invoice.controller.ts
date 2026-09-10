import type { RequestHandler } from "express";
import type { AuthRequest } from "../../types/common.types.js";
import type { MonthlyBillingService } from "../../services/monthly-billing.service.js";

export class StudentInvoiceController {
  constructor(private service: MonthlyBillingService) {}
  list: RequestHandler = async (request: AuthRequest, response, next) => {
    try {
      response.json({
        success: true,
        message: "Hóa đơn của sinh viên",
        data: await this.service.myInvoices(
          request.user!.userId,
          request.query as never,
        ),
      });
    } catch (error) {
      next(error);
    }
  };
  get: RequestHandler = async (request: AuthRequest, response, next) => {
    try {
      response.json({
        success: true,
        message: "Chi tiết hóa đơn",
        data: await this.service.myInvoice(
          request.user!.userId,
          request.params.invoiceId!,
        ),
      });
    } catch (error) {
      next(error);
    }
  };
}
