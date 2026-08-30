import type { RoomChangeRequestDocument } from "../models/room-change-request.model.js";
export class RoomChangeRequestMapper {
  static toResponse(x: RoomChangeRequestDocument) {
    return {
      id: x._id.toString(),
      studentId: x.studentId.toString(),
      currentContractId: x.currentContractId.toString(),
      targetBedId: x.targetBedId.toString(),
      reason: x.reason,
      status: x.status,
      processedAt: x.processedAt,
      rejectReason: x.rejectReason,
      createdAt: x.createdAt,
      updatedAt: x.updatedAt,
    };
  }
}
