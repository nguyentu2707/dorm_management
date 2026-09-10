import type { TransactionContext } from "../../services/transaction-manager.js";
import type {
  RoomChangeRequestDocument,
  RoomChangeRequestStatus,
} from "../../models/room-change-request.model.js";
import type { PaginatedResult } from "../../types/common.types.js";
export type RoomChangeRequestListQuery = {
  page: number;
  limit: number;
  status?: RoomChangeRequestStatus;
  studentId?: string;
};
export type CreateRoomChangeRequestData = {
  studentId: string;
  currentContractId: string;
  targetBedId: string;
  reason?: string;
  status: "PENDING";
};
export type RoomChangeRequestStatusMetadata = {
  processedBy?: string;
  processedAt?: Date;
  rejectReason?: string;
};
export type RoomChangeDisplaySummary = {
  student: { id: string; mssv: string; fullName: string };
  currentRoom: {
    id: string;
    roomNumber: string;
    buildingName: string;
    bedNumber: string;
  };
  targetRoom: {
    id: string;
    roomNumber: string;
    buildingName: string;
    bedNumber: string;
  };
};
export interface IRoomChangeRequestRepository {
  findDisplaySummaries(
    ids: string[],
  ): Promise<Map<string, RoomChangeDisplaySummary>>;
  findById(
    id: string,
    s?: TransactionContext,
  ): Promise<RoomChangeRequestDocument | null>;
  findAll(
    q: RoomChangeRequestListQuery,
  ): Promise<PaginatedResult<RoomChangeRequestDocument>>;
  findByStudentId(id: string): Promise<RoomChangeRequestDocument[]>;
  findPendingByStudentId(
    id: string,
    s?: TransactionContext,
  ): Promise<RoomChangeRequestDocument | null>;
  create(
    d: CreateRoomChangeRequestData,
    s?: TransactionContext,
  ): Promise<RoomChangeRequestDocument>;
  updateStatus(
    id: string,
    status: RoomChangeRequestStatus,
    extra?: Partial<RoomChangeRequestStatusMetadata>,
    s?: TransactionContext,
  ): Promise<RoomChangeRequestDocument | null>;
}
