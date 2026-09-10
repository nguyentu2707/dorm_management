import type { INotificationRecipientRepository } from "../interfaces/notification-recipient.repository.interface.js";
import type { NotificationRecipientDocument } from "../../models/notification-recipient.model.js";
import type { StudentNotificationRecord } from "../interfaces/notification-recipient.repository.interface.js";
import {
  query,
  rows,
  one,
  required,
  count,
  page,
  contains,
} from "../../database/query.js";
export class PostgresNotificationRecipientRepository implements INotificationRecipientRepository {
  async createMany(
    ...[data, s]: Parameters<INotificationRecipientRepository["createMany"]>
  ): ReturnType<INotificationRecipientRepository["createMany"]> {
    if (data.length)
      await query(
        `INSERT INTO notification_recipients(notification_id,student_id) SELECT * FROM unnest($1::uuid[],$2::uuid[])`,
        [data.map((x) => x.notificationId), data.map((x) => x.studentId)],
        s,
      );
  }
  async findByStudentId(
    ...[id, q]: Parameters<INotificationRecipientRepository["findByStudentId"]>
  ): ReturnType<INotificationRecipientRepository["findByStudentId"]> {
    return page<StudentNotificationRecord>(
      `SELECT nr.notification_id,n.title,n.content,n.target_scope,nr.is_read,nr.read_at,n.created_at
      FROM notification_recipients nr
      JOIN notifications n ON n.id=nr.notification_id
      WHERE nr.student_id=$1 AND ($2::boolean IS NULL OR nr.is_read=$2)`,
      [id, q.isRead],
      q,
      "n.created_at DESC,n.id",
    );
  }
  async findOne(
    ...[notificationId, studentId]: Parameters<
      INotificationRecipientRepository["findOne"]
    >
  ): ReturnType<INotificationRecipientRepository["findOne"]> {
    return one<StudentNotificationRecord>(
      `SELECT nr.notification_id,n.title,n.content,n.target_scope,nr.is_read,nr.read_at,n.created_at
      FROM notification_recipients nr
      JOIN notifications n ON n.id=nr.notification_id
      WHERE nr.notification_id=$1 AND nr.student_id=$2`,
      [notificationId, studentId],
    );
  }
  async markAsRead(
    ...[notificationId, studentId]: Parameters<
      INotificationRecipientRepository["markAsRead"]
    >
  ): ReturnType<INotificationRecipientRepository["markAsRead"]> {
    await query(
      `UPDATE notification_recipients SET is_read=true,read_at=now(),updated_at=now() WHERE notification_id=$1 AND student_id=$2 AND NOT is_read`,
      [notificationId, studentId],
    );
    return this.findOne(notificationId, studentId);
  }
  async countUnreadByStudentId(
    ...[id]: Parameters<
      INotificationRecipientRepository["countUnreadByStudentId"]
    >
  ): ReturnType<INotificationRecipientRepository["countUnreadByStudentId"]> {
    return count(
      `SELECT count(*) FROM notification_recipients WHERE student_id=$1 AND NOT is_read`,
      [id],
      undefined,
    );
  }
  async countByNotificationId(
    ...[id]: Parameters<
      INotificationRecipientRepository["countByNotificationId"]
    >
  ): ReturnType<INotificationRecipientRepository["countByNotificationId"]> {
    return count(
      `SELECT count(*) FROM notification_recipients WHERE notification_id=$1`,
      [id],
      undefined,
    );
  }
  async countReadByNotificationId(
    ...[id]: Parameters<
      INotificationRecipientRepository["countReadByNotificationId"]
    >
  ): ReturnType<INotificationRecipientRepository["countReadByNotificationId"]> {
    return count(
      `SELECT count(*) FROM notification_recipients WHERE notification_id=$1 AND is_read`,
      [id],
      undefined,
    );
  }
}
export { PostgresNotificationRecipientRepository as NotificationRecipientRepository };
