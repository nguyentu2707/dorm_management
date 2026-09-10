import { AppError } from "../errors/AppError.js";
import type { INotificationRepository } from "../repositories/interfaces/notification.repository.interface.js";
import type { INotificationRecipientRepository } from "../repositories/interfaces/notification-recipient.repository.interface.js";
import type { IStudentRepository } from "../repositories/interfaces/student.repository.interface.js";
import type { IContractRepository } from "../repositories/interfaces/contract.repository.interface.js";
import type { IBuildingRepository } from "../repositories/interfaces/building.repository.interface.js";
import type { ITransactionManager } from "./transaction-manager.js";
import type { NotificationTargetScope } from "../models/notification.model.js";

type CreateInput = {
  title: string;
  content: string;
  targetScope: NotificationTargetScope;
  targetBuildingId?: string;
  targetStudentId?: string;
};
export class NotificationService {
  constructor(
    private notifications: INotificationRepository,
    private recipients: INotificationRecipientRepository,
    private students: IStudentRepository,
    private contracts: IContractRepository,
    private buildings: IBuildingRepository,
    private tx: ITransactionManager,
  ) {}
  async create(adminUserId: string, input: CreateInput) {
    return this.tx.runInTransaction(async (session) => {
      let studentIds: string[];
      if (input.targetScope === "ALL")
        studentIds = await this.students.findActiveIds(session);
      else if (input.targetScope === "BUILDING") {
        if (!(await this.buildings.findById(input.targetBuildingId!)))
          throw new AppError(
            404,
            "BUILDING_NOT_FOUND",
            "Không tìm thấy tòa nhà",
          );
        studentIds = await this.contracts.findActiveStudentIdsByBuildingId(
          input.targetBuildingId!,
          session,
        );
      } else {
        const student = await this.students.findById(
          input.targetStudentId!,
          session,
        );
        if (
          !student ||
          !(await this.students.isActive(input.targetStudentId!, session))
        )
          throw new AppError(
            404,
            "STUDENT_NOT_FOUND",
            "Không tìm thấy sinh viên đang hoạt động",
          );
        studentIds = [student.id];
      }
      studentIds = [
        ...new Map(studentIds.map((id) => [id.toString(), id])).values(),
      ];
      if (studentIds.length === 0)
        throw new AppError(
          409,
          "NOTIFICATION_HAS_NO_RECIPIENTS",
          "Không tìm thấy sinh viên phù hợp để nhận thông báo",
        );
      const notification = await this.notifications.create(
        {
          title: input.title,
          content: input.content,
          targetScope: input.targetScope,
          targetBuildingId: input.targetBuildingId
            ? input.targetBuildingId
            : undefined,
          targetStudentId: input.targetStudentId
            ? input.targetStudentId
            : undefined,
          createdBy: adminUserId,
        },
        session,
      );
      await this.recipients.createMany(
        studentIds.map((studentId) => ({
          notificationId: notification.id,
          studentId,
        })),
        session,
      );
      return { notification, recipientCount: studentIds.length };
    });
  }
  listAdmin(raw: {
    page?: string;
    limit?: string;
    targetScope?: NotificationTargetScope;
    search?: string;
  }) {
    return this.notifications.findAll({
      page: Number(raw.page ?? 1),
      limit: Number(raw.limit ?? 20),
      targetScope: raw.targetScope,
      search: raw.search,
    });
  }
  async detailAdmin(id: string) {
    const notification = await this.notifications.findById(id);
    if (!notification)
      throw new AppError(
        404,
        "NOTIFICATION_NOT_FOUND",
        "Không tìm thấy thông báo",
      );
    const [recipientCount, readCount] = await Promise.all([
      this.recipients.countByNotificationId(id),
      this.recipients.countReadByNotificationId(id),
    ]);
    return {
      notification,
      recipientCount,
      readCount,
      unreadCount: recipientCount - readCount,
    };
  }
  private async studentId(userId: string) {
    const student = await this.students.findByUserId(userId);
    if (!student)
      throw new AppError(404, "STUDENT_NOT_FOUND", "Không tìm thấy sinh viên");
    return student.id;
  }
  async mine(
    userId: string,
    raw: { page?: string; limit?: string; isRead?: string },
  ) {
    return this.recipients.findByStudentId(await this.studentId(userId), {
      page: Number(raw.page ?? 1),
      limit: Number(raw.limit ?? 20),
      isRead: raw.isRead === undefined ? undefined : raw.isRead === "true",
    });
  }
  async studentDetail(userId: string, notificationId: string) {
    const item = await this.recipients.findOne(
      notificationId,
      await this.studentId(userId),
    );
    if (!item)
      throw new AppError(
        404,
        "NOTIFICATION_NOT_FOUND",
        "Không tìm thấy thông báo",
      );
    return item;
  }
  async markRead(userId: string, notificationId: string) {
    const item = await this.recipients.markAsRead(
      notificationId,
      await this.studentId(userId),
    );
    if (!item)
      throw new AppError(
        404,
        "NOTIFICATION_NOT_FOUND",
        "Không tìm thấy thông báo",
      );
    return item;
  }
  async unreadCount(userId: string) {
    return {
      count: await this.recipients.countUnreadByStudentId(
        await this.studentId(userId),
      ),
    };
  }
}
