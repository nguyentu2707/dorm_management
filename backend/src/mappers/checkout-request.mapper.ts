import type { CheckoutRequestDocument } from "../models/checkout-request.model.js";
export class CheckoutRequestMapper {
  static toResponse(x: CheckoutRequestDocument) {
    return {
      id: x.id,
      reason: x.reason,
      status: x.status,
      processedAt: x.processedAt,
      rejectReason: x.rejectReason,
      cancelReason: x.cancelReason,
      createdAt: x.createdAt,
      updatedAt: x.updatedAt,
    };
  }
}
