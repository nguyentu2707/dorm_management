import type { RequestHandler } from "express";
import type { AuthRequest } from "../../types/common.types.js";
import type { ContractService } from "../../services/contract.service.js";
export class AdminContractController {
  constructor(private s: ContractService) {}
  list: RequestHandler = async (q, r, n) => {
    try {
      r.json({
        success: true,
        message: "Danh sách hợp đồng",
        data: await this.s.getContracts(q.query as never),
      });
    } catch (e) {
      n(e);
    }
  };
  get: RequestHandler = async (q, r, n) => {
    try {
      r.json({
        success: true,
        message: "Chi tiết hợp đồng",
        data: await this.s.getContractById(q.params.contractId!),
      });
    } catch (e) {
      n(e);
    }
  };
  create: RequestHandler = async (q: AuthRequest, r, n) => {
    try {
      r.status(201).json({
        success: true,
        message: "Tạo hợp đồng thành công",
        data: await this.s.adminCreateContract(q.user!.userId, q.body),
      });
    } catch (e) {
      n(e);
    }
  };
  approve: RequestHandler = async (q: AuthRequest, r, n) => {
    try {
      r.json({
        success: true,
        message: "Duyệt hợp đồng thành công",
        data: await this.s.approveContract(
          q.params.contractId!,
          q.user!.userId,
        ),
      });
    } catch (e) {
      n(e);
    }
  };
  reject: RequestHandler = async (q: AuthRequest, r, n) => {
    try {
      r.json({
        success: true,
        message: "Từ chối hợp đồng thành công",
        data: await this.s.rejectContract(
          q.params.contractId!,
          q.user!.userId,
          q.body.reason,
        ),
      });
    } catch (e) {
      n(e);
    }
  };
  end: RequestHandler = async (q: AuthRequest, r, n) => {
    try {
      r.json({
        success: true,
        message: "Kết thúc hợp đồng thành công",
        data: await this.s.endContract(q.params.contractId!, q.user!.userId),
      });
    } catch (e) {
      n(e);
    }
  };
  cancel: RequestHandler = async (q: AuthRequest, r, n) => {
    try {
      r.json({
        success: true,
        message: "Hủy hợp đồng thành công",
        data: await this.s.cancelActiveContract(
          q.params.contractId!,
          q.user!.userId,
          q.body.reason,
        ),
      });
    } catch (e) {
      n(e);
    }
  };
}
