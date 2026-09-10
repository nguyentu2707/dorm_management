import type { TransactionContext } from "../../services/transaction-manager.js";
import type {
  NotificationDocument,
  NotificationTargetScope,
} from "../../models/notification.model.js";
import type { PaginatedResult } from "../../types/common.types.js";
export type CreateNotificationData = {
  title: string;
  content: string;
  targetScope: NotificationTargetScope;
  targetBuildingId?: string;
  targetStudentId?: string;
  createdBy: string;
};
export type NotificationListQuery = {
  page: number;
  limit: number;
  targetScope?: NotificationTargetScope;
  search?: string;
};
export interface INotificationRepository {
  create(
    data: CreateNotificationData,
    session?: TransactionContext,
  ): Promise<NotificationDocument>;
  findById(id: string): Promise<NotificationDocument | null>;
  findAll(
    query: NotificationListQuery,
  ): Promise<PaginatedResult<NotificationDocument>>;
}
