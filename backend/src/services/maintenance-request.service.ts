import { AppError } from "../errors/AppError.js";
import type { IMaintenanceRequestRepository } from "../repositories/interfaces/maintenance-request.repository.interface.js";
import type { IStudentRepository } from "../repositories/interfaces/student.repository.interface.js";
import type { IContractRepository } from "../repositories/interfaces/contract.repository.interface.js";
import type { IEquipmentItemRepository } from "../repositories/interfaces/equipment-item.repository.interface.js";
import type { IStaffRepository } from "../repositories/interfaces/staff.repository.interface.js";
import type {
  MaintenanceCategory,
  MaintenanceDamageCause,
  MaintenanceResolutionMethod,
  MaintenanceStatus,
} from "../models/maintenance-request.model.js";
export class MaintenanceRequestService {
  constructor(
    private requests: IMaintenanceRequestRepository,
    private students: IStudentRepository,
    private contracts: IContractRepository,
    private equipment: IEquipmentItemRepository,
    private staff: IStaffRepository,
  ) {}
  private async studentOnly(userId: string) {
    const student = await this.students.findByUserId(userId);
    if (!student)
      throw new AppError(404, "STUDENT_NOT_FOUND", "Không tìm thấy sinh viên");
    return student;
  }
  private async context(userId: string) {
    const student = await this.students.findByUserId(userId);
    if (!student)
      throw new AppError(404, "STUDENT_NOT_FOUND", "Không tìm thấy sinh viên");
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
    const student = await this.studentOnly(userId);
    return this.requests.findByStudentId(student.id);
  }
  async studentCancel(userId: string, id: string, reason?: string) {
    const student = await this.studentOnly(userId),
      item = await this.must(id);
    if (item.studentId.toString() !== student.id)
      throw new AppError(403, "FORBIDDEN", "Không có quyền thao tác");
    if (item.status !== "PENDING")
      throw new AppError(
        409,
        "MAINTENANCE_REQUEST_NOT_PENDING",
        "Yêu cầu không còn chờ xử lý",
      );
    return this.requests.update(id, {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelReason: reason,
    });
  }
  private async must(id: string) {
    const item = await this.requests.findById(id);
    if (!item)
      throw new AppError(
        404,
        "MAINTENANCE_REQUEST_NOT_FOUND",
        "Không tìm thấy yêu cầu",
      );
    return item;
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
  async assign(id: string, staffId: string) {
    const item = await this.must(id);
    if (!["PENDING", "IN_PROGRESS"].includes(item.status))
      throw new AppError(
        409,
        "INVALID_MAINTENANCE_STATUS",
        "Trạng thái không hợp lệ",
      );
    const staff = await this.staff.findById(staffId);
    if (!staff)
      throw new AppError(404, "STAFF_NOT_FOUND", "Không tìm thấy nhân viên");
    if (staff.position !== "MAINTENANCE")
      throw new AppError(
        409,
        "STAFF_NOT_MAINTENANCE_ROLE",
        "Nhân viên không thuộc bộ phận bảo trì",
      );
    return this.requests.update(id, {
      assignedStaffId: staffId,
      status: "IN_PROGRESS",
      processingStartedAt: item.processingStartedAt ?? new Date(),
    });
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
  ) {
    const item = await this.must(id);
    if (!["PENDING", "IN_PROGRESS"].includes(item.status))
      throw new AppError(
        409,
        "INVALID_MAINTENANCE_STATUS",
        "Trạng thái không hợp lệ",
      );
    return this.requests.update(id, {
      status: "RESOLVED",
      resolvedAt: new Date(),
      processingStartedAt: item.processingStartedAt ?? new Date(),
      ...input,
    });
  }
  async adminCancel(id: string, reason?: string) {
    const item = await this.must(id);
    if (!["PENDING", "IN_PROGRESS"].includes(item.status))
      throw new AppError(
        409,
        "INVALID_MAINTENANCE_STATUS",
        "Trạng thái không hợp lệ",
      );
    return this.requests.update(id, {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelReason: reason,
    });
  }
}
