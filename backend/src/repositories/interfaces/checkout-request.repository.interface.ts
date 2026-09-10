import type { TransactionContext } from "../../services/transaction-manager.js";
import type {
  CheckoutRequestDocument,
  CheckoutRequestStatus,
} from "../../models/checkout-request.model.js";
import type { PaginatedResult } from "../../types/common.types.js";
export type CheckoutListQuery = {
  page: number;
  limit: number;
  status?: CheckoutRequestStatus;
};
export type CheckoutSummary = {
  student: { id: string; mssv: string; fullName: string };
  room: { id: string; buildingName: string; roomNumber: string };
  bed: { id: string; bedNumber: string };
  contract: { id: string; startDate: Date; endDate: Date };
};
export interface ICheckoutRequestRepository {
  create(
    data: {
      studentId: string;
      contractId: string;
      roomId: string;
      reason?: string;
      status: "PENDING";
    },
    s?: TransactionContext,
  ): Promise<CheckoutRequestDocument>;
  findById(
    id: string,
    s?: TransactionContext,
  ): Promise<CheckoutRequestDocument | null>;
  findByStudentId(id: string): Promise<CheckoutRequestDocument[]>;
  findPendingByStudentId(
    id: string,
    s?: TransactionContext,
  ): Promise<CheckoutRequestDocument | null>;
  findAll(
    q: CheckoutListQuery,
  ): Promise<PaginatedResult<CheckoutRequestDocument>>;
  findSummaries(ids: string[]): Promise<Map<string, CheckoutSummary>>;
  updatePending(
    id: string,
    status: Exclude<CheckoutRequestStatus, "PENDING">,
    metadata?: {
      processedBy?: string;
      processedAt?: Date;
      rejectReason?: string;
      cancelReason?: string;
    },
    s?: TransactionContext,
  ): Promise<CheckoutRequestDocument | null>;
  cancelPendingByContractId(
    contractId: string,
    reason: string,
    s?: TransactionContext,
  ): Promise<void>;
}
