export const MAINTENANCE_CATEGORIES = [
  "ELECTRICAL",
  "PLUMBING",
  "FURNITURE",
  "APPLIANCE",
  "OTHER",
] as const;
export const MAINTENANCE_STATUSES = [
  "PENDING",
  "IN_PROGRESS",
  "RESOLVED",
  "CANCELLED",
] as const;
export const MAINTENANCE_RESOLUTION_METHODS = ["REPAIR", "REPLACE"] as const;
export const MAINTENANCE_DAMAGE_CAUSES = [
  "WEAR_AND_TEAR",
  "STUDENT_CAUSED",
  "OTHER",
] as const;
export type MaintenanceCategory = (typeof MAINTENANCE_CATEGORIES)[number];
export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number];
export type MaintenanceResolutionMethod =
  (typeof MAINTENANCE_RESOLUTION_METHODS)[number];
export type MaintenanceDamageCause = (typeof MAINTENANCE_DAMAGE_CAUSES)[number];
export interface MaintenanceRequest {
  studentId: string;
  roomId: string;
  equipmentItemId?: string;
  category: MaintenanceCategory;
  description: string;
  status: MaintenanceStatus;
  assignedStaffId?: string;
  processingStartedAt?: Date;
  resolvedAt?: Date;
  resolutionNote?: string;
  resolutionMethod?: MaintenanceResolutionMethod;
  resolutionReason?: string;
  resolutionCost?: number;
  damageCause?: MaintenanceDamageCause;
  damageCauseDetail?: string;
  cancelledAt?: Date;
  cancelReason?: string;
  createdAt: Date;
  updatedAt: Date;
}
export type MaintenanceRequestDocument = MaintenanceRequest & { id: string };
