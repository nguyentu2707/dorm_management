import type { RequestHandler } from "express";
import type { AuthRequest } from "../../types/common.types.js";
import type { UtilityReadingService } from "../../services/utility-reading.service.js";
export class StudentUtilityReadingController {
  constructor(private s: UtilityReadingService) {}
  mine: RequestHandler = async (q: AuthRequest, r, n) => {
    try {
      r.json({
        success: true,
        message: "Chỉ số điện nước của phòng hiện tại",
        data: await this.s.mine(q.user!.userId),
      });
    } catch (e) {
      n(e);
    }
  };
}
