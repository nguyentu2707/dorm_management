export const ROOM_CHANGE_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
] as const;
export type RoomChangeRequestStatus = (typeof ROOM_CHANGE_STATUSES)[number];
export interface RoomChangeRequest {
  studentId: string;
  currentContractId: string;
  targetBedId: string;
  reason?: string;
  status: RoomChangeRequestStatus;
  processedBy?: string;
  processedAt?: Date;
  rejectReason?: string;
  createdAt: Date;
  updatedAt: Date;
}
export type RoomChangeRequestDocument = RoomChangeRequest & { id: string };
