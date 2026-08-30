import type { RequestHandler } from "express";
import type { BedService } from "../../services/admin/bed.service.js";
export class BedController {
  constructor(private s: BedService) {}
  list: RequestHandler = async (q, r, n) => {
    try {
      r.json({
        success: true,
        message: "Danh sách giường",
        data: await this.s.list(q.params.roomId!),
      });
    } catch (e) {
      n(e);
    }
  };
}
