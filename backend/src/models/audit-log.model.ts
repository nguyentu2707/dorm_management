export const AUDIT_ACTIONS = [
  "BUILDING_STATUS_CHANGED",
  "BUILDING_GENDER_CHANGED",
  "ROOM_STATUS_CHANGED",
  "ROOM_TYPE_CHANGED",
  "ROOM_TYPE_PRICE_CHANGED",
  "CONTRACT_APPROVED",
  "CONTRACT_REJECTED",
  "CONTRACT_ENDED",
  "ROOM_CHANGE_APPROVED",
  "ROOM_CHANGE_REJECTED",
  "CHECKOUT_APPROVED",
  "CHECKOUT_REJECTED",
  "MAINTENANCE_ASSIGNED",
  "MAINTENANCE_REASSIGNED",
  "MAINTENANCE_RESOLVED",
  "MAINTENANCE_CANCELLED",
  "MONTHLY_BILLING_FINALIZED",
  "MONTHLY_BILLING_CANCELLED",
  "PAYMENT_CONFIRMED",
  "PAYMENT_REJECTED",
  "PAYMENT_VOIDED",
  "STAFF_CREATED",
  "STAFF_UPDATED",
  "STAFF_ACTIVATED",
  "STAFF_DEACTIVATED",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];
export const AUDIT_ENTITY_TYPES = [
  "BUILDING",
  "ROOM",
  "ROOM_TYPE",
  "CONTRACT",
  "ROOM_CHANGE_REQUEST",
  "CHECKOUT_REQUEST",
  "MAINTENANCE_REQUEST",
  "MONTHLY_BILLING",
  "PAYMENT",
  "STAFF",
] as const;
export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];
export type AuditData = Record<string, unknown>;
export interface AuditContext {
  actorUserId: string;
  requestId?: string;
  ipAddress?: string;
}
export interface AuditLogDocument {
  id: string;
  actorUserId?: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  oldData?: AuditData;
  newData?: AuditData;
  metadata?: AuditData;
  requestId?: string;
  ipAddress?: string;
  createdAt: Date;
  actor?: { id: string; fullName: string };
}
