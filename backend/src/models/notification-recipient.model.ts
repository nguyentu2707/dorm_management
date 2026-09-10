export interface NotificationRecipient {
  notificationId: string;
  studentId: string;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
export type NotificationRecipientDocument = NotificationRecipient & {
  id: string;
};
