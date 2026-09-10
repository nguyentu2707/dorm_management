import type { INotificationRepository } from "../interfaces/notification.repository.interface.js";
import type { NotificationDocument } from "../../models/notification.model.js";
import {
  query,
  rows,
  one,
  required,
  count,
  page,
  contains,
} from "../../database/query.js";
export class PostgresNotificationRepository implements INotificationRepository {
  async create(
    ...[d, s]: Parameters<INotificationRepository["create"]>
  ): ReturnType<INotificationRepository["create"]> {
    return required<NotificationDocument>(
      `INSERT INTO notifications (title, content, target_scope, target_building_id, target_student_id, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        typeof d.title === "string" ? d.title.trim() : d.title,
        typeof d.content === "string" ? d.content.trim() : d.content,
        d.targetScope,
        d.targetBuildingId,
        d.targetStudentId,
        d.createdBy,
      ],
      s,
    );
  }
  async findById(
    ...[id]: Parameters<INotificationRepository["findById"]>
  ): ReturnType<INotificationRepository["findById"]> {
    return one<NotificationDocument>(
      `SELECT * FROM notifications WHERE id=$1`,
      [id],
      undefined,
    );
  }
  async findAll(
    ...[q]: Parameters<INotificationRepository["findAll"]>
  ): ReturnType<INotificationRepository["findAll"]> {
    return page<NotificationDocument>(
      `SELECT * FROM notifications WHERE ($1::text IS NULL OR target_scope=$1) AND ($2::text IS NULL OR title ILIKE $2)`,
      [q.targetScope, contains(q.search)],
      q,
      "created_at DESC,id",
    );
  }
}
export { PostgresNotificationRepository as NotificationRepository };
