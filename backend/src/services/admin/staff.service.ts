import { AppError } from "../../errors/AppError.js";
import type { AuditContext } from "../../models/audit-log.model.js";
import type {
  IStaffRepository,
  StaffInput,
} from "../../repositories/interfaces/staff.repository.interface.js";
import { AuditLogService } from "../audit-log.service.js";
import type { ITransactionManager } from "../transaction-manager.js";
export class StaffService {
  constructor(
    private staff: IStaffRepository,
    private tx: ITransactionManager,
    private audit: AuditLogService,
  ) {}
  private dto(
    item: Awaited<ReturnType<IStaffRepository["findById"]>> & {
      activeAssignmentCount?: number;
    },
  ) {
    if (!item) return item;
    return {
      id: item.id,
      staffCode: item.staffCode,
      fullName: item.fullName,
      phone: item.phone,
      specialty: item.specialty,
      status: item.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      ...(item.activeAssignmentCount === undefined
        ? {}
        : { activeAssignmentCount: item.activeAssignmentCount }),
    };
  }
  async list(q: Parameters<IStaffRepository["list"]>[0]) {
    const result = await this.staff.list(q);
    return { ...result, items: result.items.map((item) => this.dto(item)!) };
  }
  async get(id: string) {
    const item = await this.staff.findById(id);
    if (!item)
      throw new AppError(404, "STAFF_NOT_FOUND", "Không tìm thấy nhân viên");
    return this.dto(item);
  }
  create(input: StaffInput, context: AuditContext) {
    return this.tx.runInTransaction(async (tx) => {
      const item = await this.staff.create(input, tx);
      await this.audit.record(
        {
          action: "STAFF_CREATED",
          entityType: "STAFF",
          entityId: item.id,
          newData: {
            staffCode: item.staffCode,
            fullName: item.fullName,
            phone: item.phone,
            specialty: item.specialty,
            status: item.status,
          },
        },
        context,
        tx,
      );
      return this.dto(item);
    });
  }
  update(id: string, input: Partial<StaffInput>, context: AuditContext) {
    return this.tx.runInTransaction(async (tx) => {
      const old = await this.staff.findById(id, tx);
      if (!old)
        throw new AppError(404, "STAFF_NOT_FOUND", "Không tìm thấy nhân viên");
      const item = (await this.staff.update(id, input, tx))!;
      const fields = ["staffCode", "fullName", "phone", "specialty"] as const;
      const changed = fields.filter((key) => item[key] !== old[key]);
      if (changed.length)
        await this.audit.record(
          {
            action: "STAFF_UPDATED",
            entityType: "STAFF",
            entityId: id,
            oldData: Object.fromEntries(changed.map((key) => [key, old[key]])),
            newData: Object.fromEntries(changed.map((key) => [key, item[key]])),
          },
          context,
          tx,
        );
      return this.dto(item);
    });
  }
  status(id: string, status: "ACTIVE" | "INACTIVE", context: AuditContext) {
    return this.tx.runInTransaction(async (tx) => {
      const old = await this.staff.findById(id, tx);
      if (!old)
        throw new AppError(404, "STAFF_NOT_FOUND", "Không tìm thấy nhân viên");
      if (old.status === status) return this.dto(old);
      if (
        status === "INACTIVE" &&
        (await this.staff.countActiveAssignments(id, tx))
      )
        throw new AppError(
          409,
          "STAFF_HAS_ACTIVE_ASSIGNMENTS",
          "Nhân viên vẫn còn yêu cầu bảo trì chưa hoàn tất",
        );
      const item = (await this.staff.updateStatus(id, status, tx))!;
      await this.audit.record(
        {
          action: status === "ACTIVE" ? "STAFF_ACTIVATED" : "STAFF_DEACTIVATED",
          entityType: "STAFF",
          entityId: id,
          oldData: { status: old.status },
          newData: { status },
        },
        context,
        tx,
      );
      return this.dto(item);
    });
  }
}
