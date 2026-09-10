import type { RequestHandler } from "express";
import type { AuthRequest } from "../../types/common.types.js";
import type { CheckoutRequestService } from "../../services/checkout-request.service.js";
export class StudentCheckoutRequestController {
  constructor(private s: CheckoutRequestService) {}
  create: RequestHandler = async (q: AuthRequest, r, n) => {
    try {
      r.status(201).json({
        success: true,
        message: "Tạo yêu cầu trả phòng thành công",
        data: await this.s.create(q.user!.userId, q.body.reason),
      });
    } catch (e) {
      n(e);
    }
  };
  mine: RequestHandler = async (q: AuthRequest, r, n) => {
    try {
      r.json({
        success: true,
        message: "Yêu cầu trả phòng của tôi",
        data: await this.s.mine(q.user!.userId),
      });
    } catch (e) {
      n(e);
    }
  };
  cancel: RequestHandler = async (q: AuthRequest, r, n) => {
    try {
      r.json({
        success: true,
        message: "Hủy yêu cầu trả phòng thành công",
        data: await this.s.cancel(q.user!.userId, q.params.requestId!),
      });
    } catch (e) {
      n(e);
    }
  };
}
