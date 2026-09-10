export const ROOM_STATUSES = [
  "AVAILABLE",
  "FULL",
  "MAINTENANCE",
  "LOCKED",
] as const;
export type RoomStatus = (typeof ROOM_STATUSES)[number];
export interface Room {
  buildingId: string;
  roomTypeId: string;
  roomNumber: string;
  floor: number;
  status: RoomStatus;
  createdAt: Date;
  updatedAt: Date;
}
export type RoomDocument = Room & { id: string };
