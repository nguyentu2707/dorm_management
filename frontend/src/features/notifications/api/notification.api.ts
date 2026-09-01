import { apiClient, dataOf } from "../../../services/api-client";
import type {
  AdminNotification,
  NotificationDetail,
  NotificationTargetScope,
  Paginated,
  StudentNotification,
} from "../../../types/api";
export type NotificationInput = {
  title: string;
  content: string;
  targetScope: NotificationTargetScope;
  targetBuildingId?: string;
  targetStudentId?: string;
};
export const studentNotificationApi = {
  list: (params: { page: number; limit: number; isRead?: boolean }) =>
    dataOf<Paginated<StudentNotification>>(
      apiClient.get("/student/notifications/me", { params }),
    ),
  detail: (id: string) =>
    dataOf<StudentNotification>(apiClient.get(`/student/notifications/${id}`)),
  markRead: (id: string) =>
    dataOf<StudentNotification>(
      apiClient.patch(`/student/notifications/${id}/read`),
    ),
  unreadCount: () =>
    dataOf<{ count: number }>(
      apiClient.get("/student/notifications/unread-count"),
    ),
};
export const adminNotificationApi = {
  list: (params: Record<string, string | number | undefined>) =>
    dataOf<Paginated<AdminNotification>>(
      apiClient.get("/admin/notifications", { params }),
    ),
  create: (input: NotificationInput) =>
    dataOf<{ notification: AdminNotification; recipientCount: number }>(
      apiClient.post("/admin/notifications", input),
    ),
  detail: (id: string) =>
    dataOf<NotificationDetail>(apiClient.get(`/admin/notifications/${id}`)),
};
