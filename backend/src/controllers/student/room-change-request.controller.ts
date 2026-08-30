import type { RequestHandler } from "express";
import type { AuthRequest } from "../../types/common.types.js";
import type { RoomChangeRequestService } from "../../services/room-change-request.service.js";
export class StudentRoomChangeRequestController {
  constructor(private s: RoomChangeRequestService) {}
  create: RequestHandler = async (q: AuthRequest, r, n) => {
    try {
      r.status(201).json({
        success: true,
        message: "Tạo yêu cầu chuyển phòng thành công",
        data: await this.s.createRequest(q.user!.userId, q.body),
      });
    } catch (e) {
      n(e);
    }
  };
  mine: RequestHandler = async (q: AuthRequest, r, n) => {
    try {
      r.json({
        success: true,
        message: "Danh sách yêu cầu chuyển phòng của tôi",
        data: await this.s.getMyRequests(q.user!.userId),
      });
    } catch (e) {
      n(e);
    }
  };
  cancel: RequestHandler = async (q: AuthRequest, r, n) => {
    try {
      r.json({
        success: true,
        message: "Hủy yêu cầu chuyển phòng thành công",
        data: await this.s.cancelRequest(q.user!.userId, q.params.requestId!),
      });
    } catch (e) {
      n(e);
    }
  };
}
