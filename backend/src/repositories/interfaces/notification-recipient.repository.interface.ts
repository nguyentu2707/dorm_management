import type { TransactionContext } from "../../services/transaction-manager.js";
import type { PaginatedResult } from "../../types/common.types.js";
export type StudentNotificationRecord = {
  notificationId: string;
  title: string;
  content: string;
  targetScope: string;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
};
export interface INotificationRecipientRepository {
  createMany(
    data: Array<{ notificationId: string; studentId: string }>,
    session?: TransactionContext,
  ): Promise<void>;
  findByStudentId(
    studentId: string,
    query: { page: number; limit: number; isRead?: boolean },
  ): Promise<PaginatedResult<StudentNotificationRecord>>;
  findOne(
    notificationId: string,
    studentId: string,
  ): Promise<StudentNotificationRecord | null>;
  markAsRead(
    notificationId: string,
    studentId: string,
  ): Promise<StudentNotificationRecord | null>;
  countUnreadByStudentId(studentId: string): Promise<number>;
  countByNotificationId(notificationId: string): Promise<number>;
  countReadByNotificationId(notificationId: string): Promise<number>;
}
