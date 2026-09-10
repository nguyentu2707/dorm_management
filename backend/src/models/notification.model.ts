export const NOTIFICATION_TARGET_SCOPES = [
  "ALL",
  "BUILDING",
  "SPECIFIC_STUDENT",
] as const;
export type NotificationTargetScope =
  (typeof NOTIFICATION_TARGET_SCOPES)[number];

export interface Notification {
  title: string;
  content: string;
  targetScope: NotificationTargetScope;
  targetBuildingId?: string;
  targetStudentId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
export type NotificationDocument = Notification & { id: string };
