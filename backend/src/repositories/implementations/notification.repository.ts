import type { FilterQuery, ClientSession } from "mongoose";
import {
  NotificationModel,
  type Notification,
} from "../../models/notification.model.js";
import type {
  INotificationRepository,
  CreateNotificationData,
  NotificationListQuery,
} from "../interfaces/notification.repository.interface.js";
export class NotificationRepository implements INotificationRepository {
  async create(data: CreateNotificationData, session?: ClientSession) {
    const [item] = await NotificationModel.create([data], { session });
    return item!;
  }
  findById(id: string) {
    return NotificationModel.findById(id).lean(false).exec();
  }
  async findAll(q: NotificationListQuery) {
    const filter: FilterQuery<Notification> = {};
    if (q.targetScope) filter.targetScope = q.targetScope;
    if (q.search)
      filter.title = {
        $regex: q.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        $options: "i",
      };
    const [items, total] = await Promise.all([
      NotificationModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((q.page - 1) * q.limit)
        .limit(q.limit),
      NotificationModel.countDocuments(filter),
    ]);
    return {
      items,
      pagination: {
        page: q.page,
        limit: q.limit,
        total,
        totalPages: Math.ceil(total / q.limit),
      },
    };
  }
}
