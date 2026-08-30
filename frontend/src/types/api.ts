export type Role = "ADMIN" | "STUDENT" | "STAFF";
export type Status =
  | "PENDING"
  | "ACTIVE"
  | "ENDED"
  | "CANCELLED"
  | "REJECTED"
  | "APPROVED"
  | "AVAILABLE"
  | "FULL"
  | "MAINTENANCE"
  | "LOCKED"
  | "EMPTY"
  | "OCCUPIED"
  | "NEW"
  | "GOOD"
  | "DAMAGED"
  | "BROKEN"
  | "LOST";

export interface AuthUser {
  id: string;
  username: string;
  role: Role;
  fullName: string;
  email?: string;
  status?: string;
}
export interface ApiResponse<T> {
  success: true;
  message: string;
  data: T;
}
export interface ApiError {
  message: string;
  code?: string;
  errors?: Array<{ field: string; message: string }>;
}
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
export interface Paginated<T> {
  items: T[];
  pagination: PaginationMeta;
}
export interface Entity {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}
export interface Building extends Entity {
  name: string;
  address?: string;
  description?: string;
}
export interface RoomType extends Entity {
  name: string;
  capacity: number;
  pricePerMonth: number;
  description?: string;
}
export interface Room extends Entity {
  buildingId: string;
  roomTypeId: string;
  roomNumber: string;
  floor: number;
  status: Status;
}
export interface Bed extends Entity {
  roomId: string;
  bedNumber: string;
  status: Status;
}
export interface EquipmentCategory extends Entity {
  name: string;
  unit: string;
  defaultLifespanMonths?: number;
}
export interface Equipment extends Entity {
  categoryId: string;
  roomId: string;
  serialNumber?: string;
  condition: Status;
  purchaseDate?: string;
  purchasePrice?: number;
}
export interface Contract extends Entity {
  studentId: string;
  bedId: string;
  roomId: string;
  startDate: string;
  endDate: string;
  status: Status;
  rejectReason?: string;
  cancelReason?: string;
  approvedAt?: string;
  endedAt?: string;
}
export interface RoomChangeRequest extends Entity {
  studentId: string;
  currentContractId: string;
  targetBedId: string;
  reason?: string;
  status: Status;
  processedAt?: string;
  rejectReason?: string;
}

export interface StudentBuilding {
  id: string;
  name: string;
}
export interface StudentRoomType {
  id: string;
  name: string;
  capacity: number;
  pricePerMonth: number;
}
export interface StudentRoom {
  id: string;
  buildingId: string;
  roomNumber: string;
  floor: number;
  status: Status;
  emptyBedCount: number;
  totalBedCount: number;
  roomType: StudentRoomType;
  building?: StudentBuilding;
  beds?: Bed[];
}
export interface StudentProfile {
  id: string;
  userId: string;
  username: string;
  fullName: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  mssv: string;
  className?: string;
  faculty?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  dob?: string;
  cccd?: string;
  permanentAddress?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}
