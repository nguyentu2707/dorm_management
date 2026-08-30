import type { RequestHandler } from "express";
import type { AuthRequest } from "../../types/common.types.js";
import type { ContractService } from "../../services/contract.service.js";
export class StudentContractController {
  constructor(private s: ContractService) {}
  create: RequestHandler = async (q: AuthRequest, r, n) => {
    try {
      r.status(201).json({
        success: true,
        message: "Tạo đăng ký ở thành công",
        data: await this.s.createContract(q.user!.userId, q.body),
      });
    } catch (e) {
      n(e);
    }
  };
  mine: RequestHandler = async (q: AuthRequest, r, n) => {
    try {
      r.json({
        success: true,
        message: "Danh sách hợp đồng của tôi",
        data: await this.s.getMyContracts(q.user!.userId),
      });
    } catch (e) {
      n(e);
    }
  };
  active: RequestHandler = async (q: AuthRequest, r, n) => {
    try {
      r.json({
        success: true,
        message: "Hợp đồng đang hoạt động",
        data: await this.s.getMyActiveContract(q.user!.userId),
      });
    } catch (e) {
      n(e);
    }
  };
  cancel: RequestHandler = async (q: AuthRequest, r, n) => {
    try {
      r.json({
        success: true,
        message: "Hủy đăng ký ở thành công",
        data: await this.s.cancelPendingContract(
          q.user!.userId,
          q.params.contractId!,
          q.body.reason,
        ),
      });
    } catch (e) {
      n(e);
    }
  };
}
