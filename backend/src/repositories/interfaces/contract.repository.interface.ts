import type { TransactionContext } from "../../services/transaction-manager.js";
import type {
  ContractDocument,
  ContractStatus,
} from "../../models/contract.model.js";
import type { PaginatedResult } from "../../types/common.types.js";

export type ContractListQuery = {
  page: number;
  limit: number;
  status?: ContractStatus;
  studentId?: string;
  roomId?: string;
  buildingId?: string;
  sortBy?: "createdAt" | "startDate" | "endDate";
  sortOrder?: "asc" | "desc";
};
export type CreateContractData = {
  studentId: string;
  bedId: string;
  roomId: string;
  startDate: Date;
  endDate: Date;
  status: ContractStatus;
  approvedBy?: string;
  approvedAt?: Date;
};
export type ContractStatusMetadata = {
  rejectReason?: string;
  cancelReason?: string;
  approvedBy?: string;
  approvedAt?: Date;
  endedAt?: Date;
};
export type ContractDisplaySummary = {
  student: { id: string; mssv: string; fullName: string };
  room: { id: string; roomNumber: string; buildingName: string };
  bed: { id: string; bedNumber: string };
};
export type ResidenceHistoryItem = {
  contractId: string;
  status: "ACTIVE" | "ENDED" | "CANCELLED";
  isCurrent: boolean;
  building: { id: string | null; name: string | null };
  room: { id: string; roomNumber: string | null };
  bed: { id: string | null; bedNumber: string | null };
  segmentStartDate: Date;
  plannedEndDate: Date;
  actualEndDate: Date | null;
  consistencyIssues: string[];
};
export type BillingResidenceSegment = {
  contractId: string;
  studentId: string;
  mssv: string;
  fullName: string;
  status: ContractStatus;
  startDate: Date;
  endDate: Date;
  endedAt: Date | null;
  nextSegmentStartDate: Date | null;
  roomMonthlyPrice: number;
};
export interface IContractRepository {
  findBillingResidenceSegments(
    roomId: string,
    session?: TransactionContext,
  ): Promise<BillingResidenceSegment[]>;
  findResidenceHistoryByStudentId(id: string): Promise<ResidenceHistoryItem[]>;
  findActiveStudentIdsByBuildingId(
    buildingId: string,
    session?: TransactionContext,
  ): Promise<string[]>;
  findById(
    id: string,
    s?: TransactionContext,
  ): Promise<ContractDocument | null>;
  findAll(q: ContractListQuery): Promise<PaginatedResult<ContractDocument>>;
  findDisplaySummaries(
    ids: string[],
  ): Promise<Map<string, ContractDisplaySummary>>;
  findByStudentId(id: string): Promise<ContractDocument[]>;
  findActiveByStudentId(
    id: string,
    s?: TransactionContext,
  ): Promise<ContractDocument | null>;
  findPendingOrActiveByStudentId(
    id: string,
    s?: TransactionContext,
  ): Promise<ContractDocument | null>;
  findActiveByBedId(
    id: string,
    s?: TransactionContext,
  ): Promise<ContractDocument | null>;
  findPendingByBedId(
    id: string,
    s?: TransactionContext,
  ): Promise<ContractDocument[]>;
  create(
    d: CreateContractData,
    s?: TransactionContext,
  ): Promise<ContractDocument>;
  updateStatus(
    id: string,
    status: ContractStatus,
    extra?: Partial<ContractStatusMetadata>,
    s?: TransactionContext,
  ): Promise<ContractDocument | null>;
  rejectPendingByBedIdExcept(
    bedId: string,
    exceptId: string,
    reason: string,
    s?: TransactionContext,
  ): Promise<number>;
}
