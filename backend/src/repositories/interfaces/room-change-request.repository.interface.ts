import type { ClientSession } from "mongoose";
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
export interface IRoomChangeRequestRepository {
  findById(
    id: string,
    s?: ClientSession,
  ): Promise<RoomChangeRequestDocument | null>;
  findAll(
    q: RoomChangeRequestListQuery,
  ): Promise<PaginatedResult<RoomChangeRequestDocument>>;
  findByStudentId(id: string): Promise<RoomChangeRequestDocument[]>;
  findPendingByStudentId(
    id: string,
    s?: ClientSession,
  ): Promise<RoomChangeRequestDocument | null>;
  create(
    d: CreateRoomChangeRequestData,
    s?: ClientSession,
  ): Promise<RoomChangeRequestDocument>;
  updateStatus(
    id: string,
    status: RoomChangeRequestStatus,
    extra?: Partial<RoomChangeRequestStatusMetadata>,
    s?: ClientSession,
  ): Promise<RoomChangeRequestDocument | null>;
}
