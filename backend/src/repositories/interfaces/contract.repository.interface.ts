import type { ClientSession, Types } from "mongoose";
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
export interface IContractRepository {
  findActiveStudentIdsByBuildingId(
    buildingId: string,
    session?: ClientSession,
  ): Promise<Types.ObjectId[]>;
  findById(id: string, s?: ClientSession): Promise<ContractDocument | null>;
  findAll(q: ContractListQuery): Promise<PaginatedResult<ContractDocument>>;
  findDisplaySummaries(
    ids: string[],
  ): Promise<Map<string, ContractDisplaySummary>>;
  findByStudentId(id: string): Promise<ContractDocument[]>;
  findActiveByStudentId(
    id: string,
    s?: ClientSession,
  ): Promise<ContractDocument | null>;
  findPendingOrActiveByStudentId(
    id: string,
    s?: ClientSession,
  ): Promise<ContractDocument | null>;
  findActiveByBedId(
    id: string,
    s?: ClientSession,
  ): Promise<ContractDocument | null>;
  findPendingByBedId(
    id: string,
    s?: ClientSession,
  ): Promise<ContractDocument[]>;
  create(d: CreateContractData, s?: ClientSession): Promise<ContractDocument>;
  updateStatus(
    id: string,
    status: ContractStatus,
    extra?: Partial<ContractStatusMetadata>,
    s?: ClientSession,
  ): Promise<ContractDocument | null>;
  rejectPendingByBedIdExcept(
    bedId: string,
    exceptId: string,
    reason: string,
    s?: ClientSession,
  ): Promise<number>;
}
