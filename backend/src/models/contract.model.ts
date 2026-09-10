export const CONTRACT_STATUSES = [
  "PENDING",
  "ACTIVE",
  "ENDED",
  "CANCELLED",
  "REJECTED",
] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export interface Contract {
  studentId: string;
  bedId: string;
  roomId: string;
  startDate: Date;
  endDate: Date;
  status: ContractStatus;
  rejectReason?: string;
  cancelReason?: string;
  approvedBy?: string;
  approvedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type ContractDocument = Contract & { id: string };
