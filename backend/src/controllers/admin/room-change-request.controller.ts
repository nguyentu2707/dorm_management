import type { RequestHandler } from "express";
import type { AuthRequest } from "../../types/common.types.js";
import type { RoomChangeRequestService } from "../../services/room-change-request.service.js";
export class AdminRoomChangeRequestController {
  constructor(private s: RoomChangeRequestService) {}
  list: RequestHandler = async (q, r, n) => {
    try {
      r.json({
        success: true,
        message: "Danh sách yêu cầu chuyển phòng",
        data: await this.s.getRequests(q.query as never),
      });
    } catch (e) {
      n(e);
    }
  };
  get: RequestHandler = async (q, r, n) => {
    try {
      r.json({
        success: true,
        message: "Chi tiết yêu cầu chuyển phòng",
        data: await this.s.getRequestById(q.params.requestId!),
      });
    } catch (e) {
      n(e);
    }
  };
  approve: RequestHandler = async (q: AuthRequest, r, n) => {
    try {
      r.json({
        success: true,
        message: "Duyệt yêu cầu chuyển phòng thành công",
        data: await this.s.approveRequest(q.params.requestId!, q.user!.userId),
      });
    } catch (e) {
      n(e);
    }
  };
  reject: RequestHandler = async (q: AuthRequest, r, n) => {
    try {
      r.json({
        success: true,
        message: "Từ chối yêu cầu chuyển phòng thành công",
        data: await this.s.rejectRequest(
          q.params.requestId!,
          q.user!.userId,
          q.body.reason,
        ),
      });
    } catch (e) {
      n(e);
    }
  };
}
