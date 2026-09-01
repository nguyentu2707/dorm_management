import type { ClientSession, Types } from "mongoose";
import type {
  NotificationDocument,
  NotificationTargetScope,
} from "../../models/notification.model.js";
import type { PaginatedResult } from "../../types/common.types.js";
export type CreateNotificationData = {
  title: string;
  content: string;
  targetScope: NotificationTargetScope;
  targetBuildingId?: Types.ObjectId;
  targetStudentId?: Types.ObjectId;
  createdBy: Types.ObjectId;
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
    session?: ClientSession,
  ): Promise<NotificationDocument>;
  findById(id: string): Promise<NotificationDocument | null>;
  findAll(
    query: NotificationListQuery,
  ): Promise<PaginatedResult<NotificationDocument>>;
}
