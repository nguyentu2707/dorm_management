import { AppError } from "../errors/AppError.js";
import type { AuditContext } from "../models/audit-log.model.js";
import type {
  MaintenanceCategory,
  MaintenanceDamageCause,
  MaintenanceResolutionMethod,
  MaintenanceStatus,
} from "../models/maintenance-request.model.js";
import type { IContractRepository } from "../repositories/interfaces/contract.repository.interface.js";
import type { IEquipmentItemRepository } from "../repositories/interfaces/equipment-item.repository.interface.js";
import type { IMaintenanceRequestRepository } from "../repositories/interfaces/maintenance-request.repository.interface.js";
import type { IStaffRepository } from "../repositories/interfaces/staff.repository.interface.js";
import type { IStudentRepository } from "../repositories/interfaces/student.repository.interface.js";
import type { AuditLogService } from "./audit-log.service.js";
import type {
  ITransactionManager,
  TransactionContext,
} from "./transaction-manager.js";

export class MaintenanceRequestService {
  constructor(
    private requests: IMaintenanceRequestRepository,
    private students: IStudentRepository,
    private contracts: IContractRepository,
    private equipment: IEquipmentItemRepository,
    private staff: IStaffRepository,
    private tx?: ITransactionManager,
    private audit?: AuditLogService,
  ) {}
  private async studentOnly(userId: string) {
    const student = await this.students.findByUserId(userId);
    if (!student)
      throw new AppError(404, "STUDENT_NOT_FOUND", "Không tìm thấy sinh viên");
    return student;
  }
  private async context(userId: string) {
    const student = await this.studentOnly(userId);
    const contract = await this.contracts.findActiveByStudentId(student.id);
    if (!contract)
      throw new AppError(
        409,
        "NO_ACTIVE_CONTRACT",
        "Bạn cần có hợp đồng đang hiệu lực",
      );
    return { student, contract };
  }
  async equipmentMine(userId: string) {
    const { contract } = await this.context(userId);
    return this.equipment.findByRoomId(contract.roomId.toString(), 1, 100);
  }
  async create(
    userId: string,
    input: {
      category: MaintenanceCategory;
      description: string;
      equipmentItemId?: string;
    },
  ) {
    const { student, contract } = await this.context(userId);
    if (input.equipmentItemId) {
      const item = await this.equipment.findById(input.equipmentItemId);
      if (!item)
        throw new AppError(
          404,
          "EQUIPMENT_NOT_FOUND",
          "Không tìm thấy thiết bị",
        );
      if (item.roomId.toString() !== contract.roomId.toString())
        throw new AppError(
          409,
          "EQUIPMENT_NOT_IN_ROOM",
          "Thiết bị không thuộc phòng hiện tại",
        );
    }
    return this.requests.create({
      studentId: student.id,
      roomId: contract.roomId.toString(),
      ...input,
    });
  }
  async mine(userId: string) {
    return this.requests.findByStudentId((await this.studentOnly(userId)).id);
  }
  private async must(id: string, tx?: TransactionContext) {
    const item = await this.requests.findById(id, tx);
    if (!item)
      throw new AppError(
        404,
        "MAINTENANCE_REQUEST_NOT_FOUND",
        "Không tìm thấy yêu cầu",
      );
    return item;
  }
  private ensureOpen(status: MaintenanceStatus) {
    if (!["PENDING", "IN_PROGRESS"].includes(status))
      throw new AppError(
        409,
        "INVALID_MAINTENANCE_STATUS",
        "Trạng thái không hợp lệ",
      );
  }
  list(q: {
    page: number;
    limit: number;
    status?: MaintenanceStatus;
    roomId?: string;
    buildingId?: string;
    category?: MaintenanceCategory;
    assignedStaffId?: string;
  }) {
    return this.requests.findAll(q);
  }
  maintenanceStaff() {
    return this.staff.findMaintenanceStaff();
  }
  detail(id: string) {
    return this.must(id);
  }
  async studentCancel(
    userId: string,
    id: string,
    reason?: string,
    context?: AuditContext,
  ) {
    const student = await this.studentOnly(userId),
      snapshot = await this.must(id);
    if (snapshot.studentId.toString() !== student.id)
      throw new AppError(403, "FORBIDDEN", "Không có quyền thao tác");
    if (snapshot.status !== "PENDING")
      throw new AppError(
        409,
        "MAINTENANCE_REQUEST_NOT_PENDING",
        "Yêu cầu không còn chờ xử lý",
      );
    if (!this.tx)
      return this.requests.update(id, {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelReason: reason,
      });
    return this.tx.runInTransaction(async (tx) => {
      const item = await this.must(id, tx);
      if (item.status !== "PENDING")
        throw new AppError(
          409,
          "MAINTENANCE_REQUEST_NOT_PENDING",
          "Yêu cầu không còn chờ xử lý",
        );
      const updated = await this.requests.update(
        id,
        { status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason },
        tx,
      );
      if (this.audit && context)
        await this.audit.record(
          {
            action: "MAINTENANCE_CANCELLED",
            entityType: "MAINTENANCE_REQUEST",
            entityId: id,
            oldData: { status: item.status },
            newData: { status: "CANCELLED", cancelReason: reason },
          },
          context,
          tx,
        );
      return updated;
    });
  }
  async assign(id: string, staffId: string, context?: AuditContext) {
    const work = async (tx?: TransactionContext) => {
      const item = await this.must(id, tx);
      this.ensureOpen(item.status);
      const assignee = await this.staff.findById(staffId, tx);
      if (!assignee)
        throw new AppError(404, "STAFF_NOT_FOUND", "Không tìm thấy nhân viên");
      if (assignee.status !== "ACTIVE")
        throw new AppError(
          409,
          "STAFF_INACTIVE",
          "Nhân viên không hoạt động và không thể nhận phân công",
        );
      const updated = await this.requests.update(
        id,
        {
          assignedStaffId: staffId,
          status: "IN_PROGRESS",
          processingStartedAt: item.processingStartedAt ?? new Date(),
        },
        tx,
      );
      if (this.audit && context && tx)
        await this.audit.record(
          {
            action: item.assignedStaffId
              ? "MAINTENANCE_REASSIGNED"
              : "MAINTENANCE_ASSIGNED",
            entityType: "MAINTENANCE_REQUEST",
            entityId: id,
            oldData: {
              assignedStaffId: item.assignedStaffId,
              status: item.status,
            },
            newData: { assignedStaffId: staffId, status: "IN_PROGRESS" },
            metadata: {
              staffCode: assignee.staffCode,
              fullName: assignee.fullName,
            },
          },
          context,
          tx,
        );
      return updated;
    };
    return this.tx ? this.tx.runInTransaction(work) : work();
  }
  async resolve(
    id: string,
    input: {
      resolutionMethod: MaintenanceResolutionMethod;
      damageCause: MaintenanceDamageCause;
      damageCauseDetail?: string;
      resolutionReason: string;
      resolutionCost: number;
      resolutionNote?: string;
    },
    context?: AuditContext,
  ) {
    const work = async (tx?: TransactionContext) => {
      const item = await this.must(id, tx);
      this.ensureOpen(item.status);
      const updated = await this.requests.update(
        id,
        {
          status: "RESOLVED",
          resolvedAt: new Date(),
          processingStartedAt: item.processingStartedAt ?? new Date(),
          ...input,
        },
        tx,
      );
      if (this.audit && context && tx)
        await this.audit.record(
          {
            action: "MAINTENANCE_RESOLVED",
            entityType: "MAINTENANCE_REQUEST",
            entityId: id,
            oldData: { status: item.status },
            newData: {
              status: "RESOLVED",
              resolutionMethod: input.resolutionMethod,
              resolutionCost: input.resolutionCost,
            },
          },
          context,
          tx,
        );
      return updated;
    };
    return this.tx ? this.tx.runInTransaction(work) : work();
  }
  async adminCancel(id: string, reason?: string, context?: AuditContext) {
    const work = async (tx?: TransactionContext) => {
      const item = await this.must(id, tx);
      this.ensureOpen(item.status);
      const updated = await this.requests.update(
        id,
        { status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason },
        tx,
      );
      if (this.audit && context && tx)
        await this.audit.record(
          {
            action: "MAINTENANCE_CANCELLED",
            entityType: "MAINTENANCE_REQUEST",
            entityId: id,
            oldData: { status: item.status },
            newData: { status: "CANCELLED", cancelReason: reason },
          },
          context,
          tx,
        );
      return updated;
    };
    return this.tx ? this.tx.runInTransaction(work) : work();
  }
}
