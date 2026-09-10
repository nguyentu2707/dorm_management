export const CHECKOUT_REQUEST_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
] as const;
export type CheckoutRequestStatus = (typeof CHECKOUT_REQUEST_STATUSES)[number];
export interface CheckoutRequest {
  studentId: string;
  contractId: string;
  roomId: string;
  reason?: string;
  status: CheckoutRequestStatus;
  processedBy?: string;
  processedAt?: Date;
  rejectReason?: string;
  cancelReason?: string;
  createdAt: Date;
  updatedAt: Date;
}
export type CheckoutRequestDocument = CheckoutRequest & { id: string };
