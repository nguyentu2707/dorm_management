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
export interface StudentRegistryRecord {
  id: string;
  studentCode: string;
  fullName: string;
  email?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  dateOfBirth?: string;
  status: "AVAILABLE" | "CLAIMED" | "DISABLED";
  claimedUserId?: string;
  createdAt: string;
  updatedAt: string;
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
  status: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
  allowedGender: "MALE" | "FEMALE" | "MIXED";
  floorCount?: number;
  roomCount?: number;
  totalBeds?: number;
  occupiedBeds?: number;
  emptyBeds?: number;
}
export interface BuildingFloorRoom {
  id: string;
  roomNumber: string;
  floor: number;
  status: Status;
  roomTypeId: string;
  roomTypeName: string;
  capacity: number;
  totalBeds: number;
  occupiedBeds: number;
  emptyBeds: number;
}
export interface BuildingOverview {
  building: Building;
  summary: {
    floorCount: number;
    roomCount: number;
    totalBeds: number;
    occupiedBeds: number;
    emptyBeds: number;
    occupancyPercent: number;
  };
  floors: Array<{
    floor: number;
    roomCount: number;
    totalBeds: number;
    occupiedBeds: number;
    emptyBeds: number;
    rooms: BuildingFloorRoom[];
  }>;
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
  roomPricePerMonthSnapshot: number | null;
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
  currentRoom?: {
    id: string;
    roomNumber: string;
    buildingName: string;
    bedNumber: string;
  };
  targetRoom?: {
    id: string;
    roomNumber: string;
    buildingName: string;
    bedNumber: string;
  };
}
export interface CheckoutRequest extends Entity {
  status: Status;
  reason?: string;
  rejectReason?: string;
  cancelReason?: string;
  processedAt?: string;
  student?: { id: string; mssv: string; fullName: string };
  room?: { id: string; buildingName: string; roomNumber: string };
  bed?: { id: string; bedNumber: string };
  contract?: { id: string; startDate: string; endDate: string };
}
export interface ResidenceHistoryItem {
  contractId: string;
  status: "ACTIVE" | "ENDED" | "CANCELLED";
  isCurrent: boolean;
  building: { id: string | null; name: string | null };
  room: { id: string; roomNumber: string | null };
  bed: { id: string | null; bedNumber: string | null };
  segmentStartDate: string;
  plannedEndDate: string;
  actualEndDate: string | null;
  consistencyIssues: string[];
}
export interface ResidenceHistoryResponse {
  items: ResidenceHistoryItem[];
}
export interface UtilityReadingInput {
  roomId: string;
  billingPeriod: string;
  electricityPrevious: number;
  electricityCurrent: number;
  electricityUnitPrice: number;
  waterPrevious: number;
  waterCurrent: number;
  waterUnitPrice: number;
}
export interface UtilityReading extends Entity {
  billingPeriod: string;
  room: {
    id: string;
    roomNumber: string;
    building: { id: string; name: string };
  };
  electricity: {
    previous: number;
    current: number;
    usage: number;
    unitPrice: number;
    amount: number;
  };
  water: {
    previous: number;
    current: number;
    usage: number;
    unitPrice: number;
    amount: number;
  };
  totalUtilityAmount: number;
}
export type MonthlyBillingStatus = "DRAFT" | "FINALIZED" | "CANCELLED";
export interface BillingRoom {
  id: string;
  roomNumber: string;
  building: { id: string; name: string };
}
export interface BillingResidentPreview {
  contractId: string;
  studentId: string;
  mssv: string;
  fullName: string;
  residentDays: number;
  roomMonthlyPrice: number;
  roomFee: number;
  electricityShare: number;
  waterShare: number;
  wifiShare: number;
  trashShare: number;
  totalAmount: number;
}
export interface MonthlyBillingPreview {
  room: BillingRoom;
  billingPeriod: string;
  daysInMonth: number;
  electricity: {
    previous: number;
    current: number;
    usage: number;
    unitPrice: number;
    amount: number;
  };
  water: {
    previous: number;
    current: number;
    usage: number;
    unitPrice: number;
    amount: number;
  };
  wifiFee: number;
  trashFee: number;
  sharedServiceTotal: number;
  totalResidentDays: number;
  residents: BillingResidentPreview[];
  totalInvoiceAmount: number;
  warnings: string[];
}
export interface StudentInvoice extends Entity {
  monthlyBillingId: string;
  studentId: string;
  contractId: string;
  billingPeriod: string;
  status: "UNPAID" | "PARTIALLY_PAID" | "PAID" | "CANCELLED";
  paidAmount: number;
  remainingAmount: number;
  pendingAmount: number;
  paymentStatus: "UNPAID" | "PARTIALLY_PAID" | "PAID" | "CANCELLED";
  room: { buildingName: string; roomNumber: string };
  student: { fullName: string; mssv: string };
  residentDays: number;
  daysInMonth: number;
  roomMonthlyPrice: number;
  roomFee: number;
  electricityShare: number;
  waterShare: number;
  wifiShare: number;
  trashShare: number;
  totalAmount: number;
  items?: Array<{
    id: string;
    type: string;
    description: string;
    amount: number;
    calculationNote: string;
  }>;
}
export interface MonthlyBilling extends Entity {
  billingPeriod: string;
  status: MonthlyBillingStatus;
  room: BillingRoom;
  draft: {
    electricityPrevious: number;
    electricityCurrent: number;
    waterPrevious: number;
    waterCurrent: number;
  };
  electricity?: MonthlyBillingPreview["electricity"];
  water?: MonthlyBillingPreview["water"];
  wifiFee?: number;
  trashFee?: number;
  sharedServiceTotal?: number;
  totalInvoiceAmount?: number;
  invoices?: StudentInvoice[];
  cancelReason?: string;
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
  facility: {
    totalBuildings: number;
    activeBuildings: number;
    totalRooms: number;
    totalBeds: number;
    totalUsableBeds: number;
    occupiedBeds: number;
    emptyBeds: number;
    occupancyRate: number;
  };
  residence: {
    activeContracts: number;
    pendingContracts: number;
    pendingRoomChanges: number;
    pendingCheckouts: number;
  };
  operations: {
    pendingMaintenance: number;
    inProgressMaintenance: number;
    activeStaff: number;
  };
  finance: {
    unpaidInvoices: number;
    partiallyPaidInvoices: number;
    paidInvoices: number;
    billedAmount: number;
    outstandingAmount: number;
    confirmedRevenueAllTime: number;
    confirmedRevenueThisMonth: number;
  };
  expiringContracts: { within7Days: number; within30Days: number };
  occupancyByBuilding: Array<{
    buildingId: string;
    buildingName: string;
    allowedGender: "MALE" | "FEMALE" | "MIXED";
    totalBeds: number;
    totalUsableBeds: number;
    occupiedBeds: number;
    emptyBeds: number;
    occupancyRate: number;
  }>;
}
export interface DashboardTrends {
  revenue: Array<{ period: string; amount: number }>;
  utilities: Array<{
    period: string;
    electricityUsage: number;
    waterUsage: number;
  }>;
  maintenanceByStatus: Array<{ status: MaintenanceStatus; count: number }>;
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
export type MaintenanceResolutionMethod = "REPAIR" | "REPLACE";
export type MaintenanceDamageCause =
  "WEAR_AND_TEAR" | "STUDENT_CAUSED" | "OTHER";
export interface MaintenanceRequest extends Entity {
  studentId: string;
  roomId: string;
  equipmentItemId?: string;
  category: MaintenanceCategory;
  description: string;
  status: MaintenanceStatus;
  assignedStaffId?: string;
  assignedStaff?: {
    id: string;
    staffCode: string;
    fullName: string;
    status: "ACTIVE" | "INACTIVE";
  };
  processingStartedAt?: string;
  resolutionNote?: string;
  resolutionMethod?: MaintenanceResolutionMethod;
  resolutionReason?: string;
  resolutionCost?: number;
  damageCause?: MaintenanceDamageCause;
  damageCauseDetail?: string;
  cancelReason?: string;
  resolvedAt?: string;
  cancelledAt?: string;
}
export interface Staff extends Entity {
  staffCode: string;
  fullName: string;
  phone?: string;
  specialty?: string;
  status: "ACTIVE" | "INACTIVE";
  activeAssignmentCount?: number;
}
export type AuditAction =
  | "BUILDING_STATUS_CHANGED"
  | "BUILDING_GENDER_CHANGED"
  | "ROOM_STATUS_CHANGED"
  | "ROOM_TYPE_CHANGED"
  | "ROOM_TYPE_PRICE_CHANGED"
  | "CONTRACT_APPROVED"
  | "CONTRACT_REJECTED"
  | "CONTRACT_ENDED"
  | "ROOM_CHANGE_APPROVED"
  | "ROOM_CHANGE_REJECTED"
  | "CHECKOUT_APPROVED"
  | "CHECKOUT_REJECTED"
  | "MAINTENANCE_ASSIGNED"
  | "MAINTENANCE_REASSIGNED"
  | "MAINTENANCE_RESOLVED"
  | "MAINTENANCE_CANCELLED"
  | "MONTHLY_BILLING_FINALIZED"
  | "MONTHLY_BILLING_CANCELLED"
  | "PAYMENT_CONFIRMED"
  | "PAYMENT_REJECTED"
  | "PAYMENT_VOIDED"
  | "STAFF_CREATED"
  | "STAFF_UPDATED"
  | "STAFF_ACTIVATED"
  | "STAFF_DEACTIVATED";
export type AuditEntityType =
  | "BUILDING"
  | "ROOM"
  | "ROOM_TYPE"
  | "CONTRACT"
  | "ROOM_CHANGE_REQUEST"
  | "CHECKOUT_REQUEST"
  | "MAINTENANCE_REQUEST"
  | "MONTHLY_BILLING"
  | "PAYMENT"
  | "STAFF";
export interface AuditLog extends Entity {
  createdAt: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  actorUserId?: string;
  actor?: { id: string; fullName: string };
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  requestId?: string;
  ipAddress?: string;
}
export type PricePreference = "LOW" | "MEDIUM" | "ANY";
export type OccupancyPreference = "MORE_EMPTY" | "MORE_OCCUPIED" | "ANY";
export interface RoomPreference extends Entity {
  pricePreference?: PricePreference;
  wantsHotWater?: boolean | null;
  occupancyPreference?: OccupancyPreference;
}
export type DayOfWeek =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";
export interface ScheduleEntry {
  dayOfWeek: DayOfWeek;
  startPeriod: number;
  endPeriod: number;
}
export interface ClassSchedule extends Entity {
  entries: ScheduleEntry[];
}
export type PersonalizationLevel = "BASIC" | "PARTIAL" | "PERSONALIZED";
export interface RoomRecommendation {
  personalizationLevel: PersonalizationLevel;
  room: {
    id: string;
    roomNumber: string;
    building: { id: string; name: string };
    pricePerMonth: number;
  };
  availableBedCount: number;
  compatibilityScore: number;
  scheduleCoverage: number;
  reasons: string[];
}
export interface RecommendationResponse {
  hasPreference: boolean;
  hasSchedule: boolean;
  items: RoomRecommendation[];
}
