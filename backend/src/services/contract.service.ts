import type {
  IContractRepository,
  ContractListQuery,
} from "../repositories/interfaces/contract.repository.interface.js";
import type { IStudentRepository } from "../repositories/interfaces/student.repository.interface.js";
import type { IBedRepository } from "../repositories/interfaces/bed.repository.interface.js";
import type { IRoomRepository } from "../repositories/interfaces/room.repository.interface.js";
import type { ITransactionManager } from "./transaction-manager.js";
import type { ClientSession } from "mongoose";
import { AppError } from "../errors/AppError.js";
import { ContractMapper } from "../mappers/contract.mapper.js";
export type CreateContractInput = {
  bedId: string;
  startDate: Date;
  endDate: Date;
};
export type AdminCreateContractInput = CreateContractInput & {
  studentId: string;
};
export class ContractService {
  constructor(
    private contracts: IContractRepository,
    private students: IStudentRepository,
    private beds: IBedRepository,
    private rooms: IRoomRepository,
    private tx: ITransactionManager,
  ) {}
  private dates(i: CreateContractInput) {
    if (i.endDate <= i.startDate)
      throw new AppError(
        400,
        "INVALID_DATE_RANGE",
        "Ngày kết thúc phải sau ngày bắt đầu",
      );
  }
  private async studentFromUser(userId: string) {
    const s = await this.students.findByUserId(userId);
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
    s: ClientSession,
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
    s: ClientSession,
  ) {
    if (currentStatus === "FULL")
      await this.rooms.updateStatus(roomId, "AVAILABLE", s);
  }
  async createContract(userId: string, i: CreateContractInput) {
    this.dates(i);
    const student = await this.studentFromUser(userId);
    const bed = await this.beds.findById(i.bedId);
    if (!bed) throw new AppError(404, "BED_NOT_FOUND", "Không tìm thấy giường");
    const room = await this.rooms.findById(bed.roomId.toString());
    if (!room)
      throw new AppError(404, "ROOM_NOT_FOUND", "Không tìm thấy phòng");
    this.roomAvailable(room.status);
    if (bed.status !== "EMPTY")
      throw new AppError(409, "BED_NOT_AVAILABLE", "Giường không khả dụng");
    if (
      await this.contracts.findPendingOrActiveByStudentId(
        student._id.toString(),
      )
    )
      throw new AppError(
        409,
        "STUDENT_ALREADY_HAS_ACTIVE_CONTRACT",
        "Sinh viên đã có hợp đồng chờ duyệt hoặc đang hoạt động",
      );
    return ContractMapper.toResponse(
      await this.contracts.create({
        studentId: student._id.toString(),
        bedId: i.bedId,
        roomId: bed.roomId.toString(),
        startDate: i.startDate,
        endDate: i.endDate,
        status: "PENDING",
      }),
    );
  }
  async getMyContracts(userId: string) {
    const s = await this.studentFromUser(userId);
    return (await this.contracts.findByStudentId(s._id.toString())).map(
      ContractMapper.toResponse,
    );
  }
  async getMyActiveContract(userId: string) {
    const s = await this.studentFromUser(userId);
    const c = await this.contracts.findActiveByStudentId(s._id.toString());
    return c ? ContractMapper.toResponse(c) : null;
  }
  async cancelPendingContract(userId: string, id: string, reason?: string) {
    const s = await this.studentFromUser(userId),
      c = await this.contracts.findById(id);
    if (!c)
      throw new AppError(404, "CONTRACT_NOT_FOUND", "Không tìm thấy hợp đồng");
    if (c.studentId.toString() !== s._id.toString())
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
    return { ...r, items: r.items.map(ContractMapper.toResponse) };
  }
  async getContractById(id: string) {
    const c = await this.contracts.findById(id);
    if (!c)
      throw new AppError(404, "CONTRACT_NOT_FOUND", "Không tìm thấy hợp đồng");
    return ContractMapper.toResponse(c);
  }
  async approveContract(id: string, adminId: string) {
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
      this.roomAvailable(room.status);
      if (!(await this.beds.occupyIfEmpty(bed._id.toString(), s)))
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
        bed._id.toString(),
        id,
        "Bed is no longer available",
        s,
      );
      await this.syncFull(room._id.toString(), room.status, s);
      return active!;
    });
    return ContractMapper.toResponse(result);
  }
  async rejectContract(id: string, _adminId: string, reason?: string) {
    const c = await this.contracts.findById(id);
    if (!c)
      throw new AppError(404, "CONTRACT_NOT_FOUND", "Không tìm thấy hợp đồng");
    if (c.status !== "PENDING")
      throw new AppError(
        409,
        "CONTRACT_NOT_PENDING",
        "Hợp đồng không còn chờ duyệt",
      );
    return ContractMapper.toResponse(
      (await this.contracts.updateStatus(id, "REJECTED", {
        rejectReason: reason,
      }))!,
    );
  }
  private async closeActive(
    id: string,
    status: "ENDED" | "CANCELLED",
    reason?: string,
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
      if (!owner || owner._id.toString() !== id)
        throw new AppError(
          409,
          "BED_NOT_AVAILABLE",
          "Trạng thái giường không nhất quán",
        );
      const room = await this.rooms.findById(c.roomId.toString(), s);
      const updated = await this.contracts.updateStatus(
        id,
        status,
        status === "ENDED" ? { endedAt: new Date() } : { cancelReason: reason },
        s,
      );
      if (!(await this.beds.releaseIfOccupied(c.bedId.toString(), s)))
        throw new AppError(
          409,
          "BED_NOT_AVAILABLE",
          "Giường không ở trạng thái đang sử dụng",
        );
      if (room) await this.syncAvailable(room._id.toString(), room.status, s);
      return updated!;
    });
    return ContractMapper.toResponse(result);
  }
  endContract(id: string, _adminId: string) {
    return this.closeActive(id, "ENDED");
  }
  cancelActiveContract(id: string, _adminId: string, reason: string) {
    return this.closeActive(id, "CANCELLED", reason);
  }
  async adminCreateContract(adminId: string, i: AdminCreateContractInput) {
    this.dates(i);
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
          startDate: i.startDate,
          endDate: i.endDate,
          status: "ACTIVE",
          approvedBy: adminId,
          approvedAt: new Date(),
        },
        s,
      );
      await this.contracts.rejectPendingByBedIdExcept(
        i.bedId,
        c._id.toString(),
        "Bed is no longer available",
        s,
      );
      await this.syncFull(room._id.toString(), room.status, s);
      return c;
    });
    return ContractMapper.toResponse(result);
  }
}
