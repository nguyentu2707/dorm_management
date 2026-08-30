import type { ContractDocument } from "../models/contract.model.js";
export class ContractMapper {
  static toResponse(c: ContractDocument) {
    return {
      id: c._id.toString(),
      studentId: c.studentId.toString(),
      bedId: c.bedId.toString(),
      roomId: c.roomId.toString(),
      startDate: c.startDate,
      endDate: c.endDate,
      status: c.status,
      rejectReason: c.rejectReason,
      cancelReason: c.cancelReason,
      approvedAt: c.approvedAt,
      endedAt: c.endedAt,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }
}
