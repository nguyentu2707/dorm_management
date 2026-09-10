import type { RequestHandler } from "express";
import type { AuthRequest } from "../../types/common.types.js";
import type { CheckoutRequestService } from "../../services/checkout-request.service.js";
export class AdminCheckoutRequestController {
  constructor(private s: CheckoutRequestService) {}
  list: RequestHandler = async (q, r, n) => {
    try {
      r.json({
        success: true,
        message: "Danh sách yêu cầu trả phòng",
        data: await this.s.list(q.query as never),
      });
    } catch (e) {
      n(e);
    }
  };
  get: RequestHandler = async (q, r, n) => {
    try {
      r.json({
        success: true,
        message: "Chi tiết yêu cầu trả phòng",
        data: await this.s.get(q.params.requestId!),
      });
    } catch (e) {
      n(e);
    }
  };
  approve: RequestHandler = async (q: AuthRequest, r, n) => {
    try {
      r.json({
        success: true,
        message: "Duyệt trả phòng thành công",
        data: await this.s.approve(q.params.requestId!, q.user!.userId),
      });
    } catch (e) {
      n(e);
    }
  };
  reject: RequestHandler = async (q: AuthRequest, r, n) => {
    try {
      r.json({
        success: true,
        message: "Từ chối trả phòng thành công",
        data: await this.s.reject(
          q.params.requestId!,
          q.user!.userId,
          q.body.rejectReason,
        ),
      });
    } catch (e) {
      n(e);
    }
  };
}
