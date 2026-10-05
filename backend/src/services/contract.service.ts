import type {
  IContractRepository,
  ContractListQuery,
} from "../repositories/interfaces/contract.repository.interface.js";
import type { IStudentRepository } from "../repositories/interfaces/student.repository.interface.js";
import type { IBedRepository } from "../repositories/interfaces/bed.repository.interface.js";
import type { IRoomRepository } from "../repositories/interfaces/room.repository.interface.js";
import type { IRoomTypeRepository } from "../repositories/interfaces/room-type.repository.interface.js";
import type { IBuildingRepository } from "../repositories/interfaces/building.repository.interface.js";
import type { ITransactionManager } from "./transaction-manager.js";
import type { TransactionContext } from "../services/transaction-manager.js";
import { AppError } from "../errors/AppError.js";
import { ContractMapper } from "../mappers/contract.mapper.js";
import { createDefaultContractPeriod } from "../utils/contract-period.js";
import type { ICheckoutRequestRepository } from "../repositories/interfaces/checkout-request.repository.interface.js";
import { assertPlacementAllowed } from "./building-placement.js";
import type { AuditContext } from "../models/audit-log.model.js";
import type { AuditLogService } from "./audit-log.service.js";
export type CreateContractInput = {
  bedId: string;
};
export type AdminCreateContractInput = CreateContractInput & {
  studentId: string;
  startDate?: Date;
  endDate?: Date;
};
export class ContractService {
  constructor(
    private contracts: IContractRepository,
    private students: IStudentRepository,
    private beds: IBedRepository,
    private rooms: IRoomRepository,
    private tx: ITransactionManager,
    private checkoutRequests: ICheckoutRequestRepository,
    private roomTypes: IRoomTypeRepository,
    private buildings: IBuildingRepository,
    private audit?: AuditLogService,
  ) {}
  private async placementAllowed(
    studentId: string,
    buildingId: string,
    s?: TransactionContext,
    lockBuilding = false,
  ) {
    const building =
      lockBuilding && s
        ? await this.buildings.findByIdForUpdate(buildingId, s)
        : await this.buildings.findById(buildingId, s);
    const student = await this.students.findById(studentId, s);
    if (!student)
      throw new AppError(404, "STUDENT_NOT_FOUND", "Không tìm thấy sinh viên");
    if (!building)
      throw new AppError(404, "BUILDING_NOT_FOUND", "Không tìm thấy tòa nhà");
    assertPlacementAllowed(student, building);
  }
  private period(i: { startDate?: Date; endDate?: Date }) {
    if (!!i.startDate !== !!i.endDate)
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "startDate và endDate phải được cung cấp cùng nhau.",
      );
    const period =
      i.startDate && i.endDate
        ? { startDate: i.startDate, endDate: i.endDate }
        : createDefaultContractPeriod();
    if (period.endDate <= period.startDate)
      throw new AppError(
        400,
        "INVALID_DATE_RANGE",
        "Ngày kết thúc phải sau ngày bắt đầu",
      );
    return period;
  }
  private async studentFromUser(userId: string, session?: TransactionContext) {
    const s = await this.students.findByUserId(userId, session);
    if (!s)
      throw new AppError(404, "STUDENT_NOT_FOUND", "Không tìm thấy sinh viên");
    return s;
  }
  private roomAvailable(status: string) {
    if (status === "LOCKED" || status === "MAINTENANCE")
      throw new AppError(
        409,
        "ROOM_NOT_AVAILABLE",
        "Phòng hiện không khả dụng",
      );
  }
  private async syncFull(
    roomId: string,
    currentStatus: string,
    s: TransactionContext,
  ) {
    if (
      currentStatus === "AVAILABLE" &&
      (await this.beds.countEmptyByRoomId(roomId, s)) === 0
    )
      await this.rooms.updateStatus(roomId, "FULL", s);
  }
  private async syncAvailable(
    roomId: string,
    currentStatus: string,
    s: TransactionContext,
  ) {
    if (currentStatus === "FULL")
      await this.rooms.updateStatus(roomId, "AVAILABLE", s);
  }
  async createContract(userId: string, i: CreateContractInput) {
    const period = createDefaultContractPeriod();
    const result = await this.tx.runInTransaction(async (s) => {
      const student = await this.studentFromUser(userId, s);
      const bed = await this.beds.findById(i.bedId, s);
      if (!bed)
        throw new AppError(404, "BED_NOT_FOUND", "Không tìm thấy giường");
      const room = await this.rooms.findById(bed.roomId.toString(), s);
      if (!room)
        throw new AppError(404, "ROOM_NOT_FOUND", "Không tìm thấy phòng");
      const roomType = await this.roomTypes.findById(room.roomTypeId, s);
      if (!roomType)
        throw new AppError(
          404,
          "ROOM_TYPE_NOT_FOUND",
          "Không tìm thấy loại phòng",
        );
      await this.placementAllowed(student.id, room.buildingId, s);
      this.roomAvailable(room.status);
      if (bed.status !== "EMPTY")
        throw new AppError(409, "BED_NOT_AVAILABLE", "Giường không khả dụng");
      if (
        await this.contracts.findPendingOrActiveByStudentId(
          student.id.toString(),
          s,
        )
      )
        throw new AppError(
          409,
          "STUDENT_ALREADY_HAS_ACTIVE_CONTRACT",
          "Sinh viên đã có hợp đồng chờ duyệt hoặc đang hoạt động",
        );
      return this.contracts.create(
        {
          studentId: student.id.toString(),
          bedId: i.bedId,
          roomId: bed.roomId.toString(),
          startDate: period.startDate,
          endDate: period.endDate,
          status: "PENDING",
          roomPricePerMonthSnapshot: roomType.pricePerMonth,
        },
        s,
      );
    });
    return ContractMapper.toResponse(result);
  }
  async getMyContracts(userId: string) {
    const s = await this.studentFromUser(userId);
    const items = await this.contracts.findByStudentId(s.id.toString());
    const summaries = await this.contracts.findDisplaySummaries(
      items.map((item) => item.id),
    );
    return items.map((item) => ({
      ...ContractMapper.toResponse(item),
      ...summaries.get(item.id),
    }));
  }
  async getMyActiveContract(userId: string) {
    const s = await this.studentFromUser(userId);
    const c = await this.contracts.findActiveByStudentId(s.id.toString());
    return c ? ContractMapper.toResponse(c) : null;
  }
  async cancelPendingContract(userId: string, id: string, reason?: string) {
    const s = await this.studentFromUser(userId),
      c = await this.contracts.findById(id);
    if (!c)
      throw new AppError(404, "CONTRACT_NOT_FOUND", "Không tìm thấy hợp đồng");
    if (c.studentId.toString() !== s.id.toString())
      throw new AppError(
        403,
        "FORBIDDEN",
        "Bạn không có quyền thao tác hợp đồng này",
      );
    if (c.status !== "PENDING")
      throw new AppError(
        409,
        "CONTRACT_NOT_PENDING",
        "Hợp đồng không còn chờ duyệt",
      );
    return ContractMapper.toResponse(
      (await this.contracts.updateStatus(id, "CANCELLED", {
        cancelReason: reason,
      }))!,
    );
  }
  async getContracts(q: ContractListQuery) {
    const r = await this.contracts.findAll(q);
    const summaries = await this.contracts.findDisplaySummaries(
      r.items.map((item) => item.id),
    );
    return {
      ...r,
      items: r.items.map((item) => ({
        ...ContractMapper.toResponse(item),
        ...summaries.get(item.id),
      })),
    };
  }
  async getContractById(id: string) {
    const c = await this.contracts.findById(id);
    if (!c)
      throw new AppError(404, "CONTRACT_NOT_FOUND", "Không tìm thấy hợp đồng");
    const summaries = await this.contracts.findDisplaySummaries([c.id]);
    return { ...ContractMapper.toResponse(c), ...summaries.get(c.id) };
  }
  async approveContract(id: string, adminId: string, context?: AuditContext) {
    const result = await this.tx.runInTransaction(async (s) => {
      const c = await this.contracts.findById(id, s);
      if (!c)
        throw new AppError(
          404,
          "CONTRACT_NOT_FOUND",
          "Không tìm thấy hợp đồng",
        );
      if (c.status !== "PENDING")
        throw new AppError(
          409,
          "CONTRACT_NOT_PENDING",
          "Hợp đồng không còn chờ duyệt",
        );
      const bed = await this.beds.findById(c.bedId.toString(), s);
      if (!bed)
        throw new AppError(404, "BED_NOT_FOUND", "Không tìm thấy giường");
      const room = await this.rooms.findById(bed.roomId.toString(), s);
      if (!room)
        throw new AppError(404, "ROOM_NOT_FOUND", "Không tìm thấy phòng");
      await this.placementAllowed(c.studentId, room.buildingId, s, true);
      this.roomAvailable(room.status);
      if (!(await this.beds.occupyIfEmpty(bed.id.toString(), s)))
        throw new AppError(
          409,
          "BED_NOT_AVAILABLE",
          "Giường không còn khả dụng",
        );
      const active = await this.contracts.updateStatus(
        id,
        "ACTIVE",
        { approvedBy: adminId, approvedAt: new Date() },
        s,
      );
      await this.contracts.rejectPendingByBedIdExcept(
        bed.id.toString(),
        id,
        "Bed is no longer available",
        s,
      );
      await this.syncFull(room.id.toString(), room.status, s);
      if (this.audit && context)
        await this.audit.record(
          {
            action: "CONTRACT_APPROVED",
            entityType: "CONTRACT",
            entityId: id,
            oldData: { status: c.status },
            newData: { status: "ACTIVE", approvedBy: adminId },
          },
          context,
          s,
        );
      return active!;
    });
    return ContractMapper.toResponse(result);
  }
  async rejectContract(
    id: string,
    adminId: string,
    reason?: string,
    context?: AuditContext,
  ) {
    const result = await this.tx.runInTransaction(async (s) => {
      const c = await this.contracts.findById(id, s);
      if (!c)
        throw new AppError(
          404,
          "CONTRACT_NOT_FOUND",
          "Không tìm thấy hợp đồng",
        );
      if (c.status !== "PENDING")
        throw new AppError(
          409,
          "CONTRACT_NOT_PENDING",
          "Hợp đồng không còn chờ duyệt",
        );
      const updated = (await this.contracts.updateStatus(
        id,
        "REJECTED",
        {
          rejectReason: reason,
        },
        s,
      ))!;
      if (this.audit && context)
        await this.audit.record(
          {
            action: "CONTRACT_REJECTED",
            entityType: "CONTRACT",
            entityId: id,
            oldData: { status: c.status },
            newData: { status: "REJECTED", rejectReason: reason },
            metadata: { processedBy: adminId },
          },
          context,
          s,
        );
      return updated;
    });
    return ContractMapper.toResponse(result);
  }
  private async closeActive(
    id: string,
    status: "ENDED" | "CANCELLED",
    reason?: string,
    context?: AuditContext,
  ) {
    const result = await this.tx.runInTransaction(async (s) => {
      const c = await this.contracts.findById(id, s);
      if (!c)
        throw new AppError(
          404,
          "CONTRACT_NOT_FOUND",
          "Không tìm thấy hợp đồng",
        );
      if (c.status !== "ACTIVE")
        throw new AppError(
          409,
          "CONTRACT_NOT_ACTIVE",
          "Hợp đồng không hoạt động",
        );
      const owner = await this.contracts.findActiveByBedId(
        c.bedId.toString(),
        s,
      );
      if (!owner || owner.id.toString() !== id)
        throw new AppError(
          409,
          "BED_NOT_AVAILABLE",
          "Trạng thái giường không nhất quán",
        );
      const room = await this.rooms.findById(c.roomId.toString(), s);
      const updated = await this.contracts.updateStatus(
        id,
        status,
        {
          endedAt: new Date(),
          ...(status === "CANCELLED" ? { cancelReason: reason } : {}),
        },
        s,
      );
      if (!(await this.beds.releaseIfOccupied(c.bedId.toString(), s)))
        throw new AppError(
          409,
          "BED_NOT_AVAILABLE",
          "Giường không ở trạng thái đang sử dụng",
        );
      if (room) await this.syncAvailable(room.id.toString(), room.status, s);
      await this.checkoutRequests.cancelPendingByContractId(
        id,
        status === "ENDED"
          ? "Hợp đồng đã được quản trị viên kết thúc."
          : "Hợp đồng đã được quản trị viên hủy.",
        s,
      );
      if (status === "ENDED" && this.audit && context)
        await this.audit.record(
          {
            action: "CONTRACT_ENDED",
            entityType: "CONTRACT",
            entityId: id,
            oldData: { status: c.status },
            newData: { status: "ENDED", endedAt: updated!.endedAt },
          },
          context,
          s,
        );
      return updated!;
    });
    return ContractMapper.toResponse(result);
  }
  endContract(id: string, _adminId: string, context?: AuditContext) {
    return this.closeActive(id, "ENDED", undefined, context);
  }
  cancelActiveContract(id: string, _adminId: string, reason: string) {
    return this.closeActive(id, "CANCELLED", reason);
  }
  async adminCreateContract(adminId: string, i: AdminCreateContractInput) {
    const period = this.period(i);
    if (!(await this.students.findById(i.studentId)))
      throw new AppError(404, "STUDENT_NOT_FOUND", "Không tìm thấy sinh viên");
    if (await this.contracts.findPendingOrActiveByStudentId(i.studentId))
      throw new AppError(
        409,
        "STUDENT_ALREADY_HAS_ACTIVE_CONTRACT",
        "Sinh viên đã có hợp đồng chờ duyệt hoặc đang hoạt động",
      );
    const result = await this.tx.runInTransaction(async (s) => {
      if (await this.contracts.findPendingOrActiveByStudentId(i.studentId, s))
        throw new AppError(
          409,
          "STUDENT_ALREADY_HAS_ACTIVE_CONTRACT",
          "Sinh viên đã có hợp đồng chờ duyệt hoặc đang hoạt động",
        );
      const bed = await this.beds.findById(i.bedId, s);
      if (!bed)
        throw new AppError(404, "BED_NOT_FOUND", "Không tìm thấy giường");
      const room = await this.rooms.findById(bed.roomId.toString(), s);
      if (!room)
        throw new AppError(404, "ROOM_NOT_FOUND", "Không tìm thấy phòng");
      const roomType = await this.roomTypes.findById(room.roomTypeId, s);
      if (!roomType)
        throw new AppError(
          404,
          "ROOM_TYPE_NOT_FOUND",
          "Không tìm thấy loại phòng",
        );
      await this.placementAllowed(i.studentId, room.buildingId, s, true);
      this.roomAvailable(room.status);
      if (!(await this.beds.occupyIfEmpty(i.bedId, s)))
        throw new AppError(
          409,
          "BED_NOT_AVAILABLE",
          "Giường không còn khả dụng",
        );
      const c = await this.contracts.create(
        {
          studentId: i.studentId,
          bedId: i.bedId,
          roomId: bed.roomId.toString(),
          startDate: period.startDate,
          endDate: period.endDate,
          status: "ACTIVE",
          approvedBy: adminId,
          approvedAt: new Date(),
          roomPricePerMonthSnapshot: roomType.pricePerMonth,
        },
        s,
      );
      await this.contracts.rejectPendingByBedIdExcept(
        i.bedId,
        c.id.toString(),
        "Bed is no longer available",
        s,
      );
      await this.syncFull(room.id.toString(), room.status, s);
      return c;
    });
    return ContractMapper.toResponse(result);
  }
}
