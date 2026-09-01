import { Types, type ClientSession } from "mongoose";
import { NotificationRecipientModel } from "../../models/notification-recipient.model.js";
import type {
  INotificationRecipientRepository,
  StudentNotificationRecord,
} from "../interfaces/notification-recipient.repository.interface.js";
export class NotificationRecipientRepository implements INotificationRecipientRepository {
  async createMany(
    data: Array<{ notificationId: Types.ObjectId; studentId: Types.ObjectId }>,
    session?: ClientSession,
  ) {
    if (data.length)
      await NotificationRecipientModel.insertMany(data, { session });
  }
  private pipeline(studentId: string, extra: Record<string, unknown> = {}) {
    return [
      { $match: { studentId: new Types.ObjectId(studentId), ...extra } },
      {
        $lookup: {
          from: "notifications",
          localField: "notificationId",
          foreignField: "_id",
          as: "notification",
        },
      },
      { $unwind: "$notification" },
      {
        $project: {
          _id: 0,
          notificationId: { $toString: "$notificationId" },
          title: "$notification.title",
          content: "$notification.content",
          targetScope: "$notification.targetScope",
          isRead: 1,
          readAt: 1,
          createdAt: "$notification.createdAt",
        },
      },
    ];
  }
  async findByStudentId(
    studentId: string,
    q: { page: number; limit: number; isRead?: boolean },
  ) {
    const extra = q.isRead === undefined ? {} : { isRead: q.isRead };
    const [result] = await NotificationRecipientModel.aggregate([
      ...this.pipeline(studentId, extra),
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          items: [{ $skip: (q.page - 1) * q.limit }, { $limit: q.limit }],
          meta: [{ $count: "total" }],
        },
      },
    ]);
    const total = result?.meta?.[0]?.total ?? 0;
    return {
      items: result?.items ?? [],
      pagination: {
        page: q.page,
        limit: q.limit,
        total,
        totalPages: Math.ceil(total / q.limit),
      },
    };
  }
  async findOne(notificationId: string, studentId: string) {
    const [item] = await NotificationRecipientModel.aggregate(
      this.pipeline(studentId, {
        notificationId: new Types.ObjectId(notificationId),
      }),
    );
    return (item as StudentNotificationRecord | undefined) ?? null;
  }
  async markAsRead(notificationId: string, studentId: string) {
    await NotificationRecipientModel.updateOne(
      { notificationId, studentId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } },
    );
    return this.findOne(notificationId, studentId);
  }
  countUnreadByStudentId(studentId: string) {
    return NotificationRecipientModel.countDocuments({
      studentId,
      isRead: false,
    });
  }
  countByNotificationId(notificationId: string) {
    return NotificationRecipientModel.countDocuments({ notificationId });
  }
  countReadByNotificationId(notificationId: string) {
    return NotificationRecipientModel.countDocuments({
      notificationId,
      isRead: true,
    });
  }
}
