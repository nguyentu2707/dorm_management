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
  | "LOST"
  | "IN_PROGRESS"
  | "RESOLVED";

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
  occupancy?: { total: number; occupied: number; empty: number };
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
  student?: { id: string; mssv: string; fullName: string };
  room?: { id: string; roomNumber: string; buildingName: string };
  bed?: { id: string; bedNumber: string };
}
export interface RoomChangeRequest extends Entity {
  studentId: string;
  currentContractId: string;
  targetBedId: string;
  reason?: string;
  status: Status;
  processedAt?: string;
  rejectReason?: string;
  student?: { id: string; mssv: string; fullName: string };
  currentRoom?: { roomNumber: string; buildingName: string; bedNumber: string };
  targetRoom?: { roomNumber: string; buildingName: string; bedNumber: string };
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
  status?: Status;
  createdAt?: string;
  updatedAt?: string;
}
export interface AdminStudent extends StudentProfile {
  hasOpenContract: boolean;
  currentContractStatus: Status | null;
  currentContractId: string | null;
}
export interface AdminEquipment extends Entity {
  serialNumber?: string;
  condition: Status;
  purchaseDate?: string;
  purchasePrice?: number;
  category: { id: string; name: string };
  room: {
    id: string;
    roomNumber: string;
    buildingId: string;
    buildingName: string;
  };
}
export interface DashboardSummary {
  rooms: {
    total: number;
    available: number;
    full: number;
    maintenance: number;
    locked: number;
  };
  beds: { total: number; occupied: number; empty: number };
  contracts: { pending: number; active: number };
  roomChangeRequests: { pending: number };
}
export type NotificationTargetScope = "ALL" | "BUILDING" | "SPECIFIC_STUDENT";
export interface StudentNotification {
  notificationId: string;
  title: string;
  content: string;
  targetScope: NotificationTargetScope;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}
export interface AdminNotification extends Entity {
  title: string;
  content: string;
  targetScope: NotificationTargetScope;
  targetBuildingId?: string;
  targetStudentId?: string;
}
export interface NotificationDetail {
  notification: AdminNotification;
  recipientCount: number;
  readCount: number;
  unreadCount: number;
}
export type MaintenanceStatus =
  "PENDING" | "IN_PROGRESS" | "RESOLVED" | "CANCELLED";
export type MaintenanceCategory =
  "ELECTRICAL" | "PLUMBING" | "FURNITURE" | "APPLIANCE" | "OTHER";
export interface MaintenanceRequest extends Entity {
  studentId: string;
  roomId: string;
  equipmentItemId?: string;
  category: MaintenanceCategory;
  description: string;
  status: MaintenanceStatus;
  assignedStaffId?: string;
  resolutionNote?: string;
  cancelReason?: string;
  resolvedAt?: string;
  cancelledAt?: string;
}
export type PricePreference = "LOW" | "MEDIUM" | "ANY";
export type OccupancyPreference = "MORE_EMPTY" | "MORE_OCCUPIED" | "ANY";
export interface RoomPreference extends Entity {
  pricePreference?: PricePreference;
  wantsHotWater?: boolean | null;
  occupancyPreference?: OccupancyPreference;
}
export type DayOfWeek = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
export interface ScheduleEntry { dayOfWeek: DayOfWeek; startPeriod: number; endPeriod: number }
export interface ClassSchedule extends Entity { entries: ScheduleEntry[] }
export type PersonalizationLevel = "BASIC" | "PARTIAL" | "PERSONALIZED";
export interface RoomRecommendation {
  personalizationLevel: PersonalizationLevel;
  room: { id: string; roomNumber: string; building: { id: string; name: string }; pricePerMonth: number };
  availableBedCount: number;
  compatibilityScore: number;
  scheduleCoverage: number;
  reasons: string[];
}
export interface RecommendationResponse { hasPreference: boolean; hasSchedule: boolean; items: RoomRecommendation[] }
