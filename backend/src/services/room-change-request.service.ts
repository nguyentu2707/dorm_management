import type {
  IRoomChangeRequestRepository,
  RoomChangeRequestListQuery,
} from "../repositories/interfaces/room-change-request.repository.interface.js";
import type { IContractRepository } from "../repositories/interfaces/contract.repository.interface.js";
import type { IStudentRepository } from "../repositories/interfaces/student.repository.interface.js";
import type { IBedRepository } from "../repositories/interfaces/bed.repository.interface.js";
import type { IRoomRepository } from "../repositories/interfaces/room.repository.interface.js";
import type { ITransactionManager } from "./transaction-manager.js";
import { AppError } from "../errors/AppError.js";
import { RoomChangeRequestMapper } from "../mappers/room-change-request.mapper.js";
export type CreateRoomChangeRequestInput = {
  targetBedId: string;
  reason?: string;
};
export class RoomChangeRequestService {
  constructor(
    private requests: IRoomChangeRequestRepository,
    private contracts: IContractRepository,
    private students: IStudentRepository,
    private beds: IBedRepository,
    private rooms: IRoomRepository,
    private tx: ITransactionManager,
  ) {}
  private async student(userId: string) {
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
  async createRequest(userId: string, i: CreateRoomChangeRequestInput) {
    const student = await this.student(userId),
      active = await this.contracts.findActiveByStudentId(
        student._id.toString(),
      );
    if (!active)
      throw new AppError(
        409,
        "NO_ACTIVE_CONTRACT",
        "Sinh viên chưa có hợp đồng đang hoạt động",
      );
    const bed = await this.beds.findById(i.targetBedId);
    if (!bed) throw new AppError(404, "BED_NOT_FOUND", "Không tìm thấy giường");
    if (active.bedId.toString() === i.targetBedId)
      throw new AppError(
        400,
        "SAME_BED",
        "Giường đích trùng với giường hiện tại",
      );
    const room = await this.rooms.findById(bed.roomId.toString());
    if (!room)
      throw new AppError(404, "ROOM_NOT_FOUND", "Không tìm thấy phòng");
    this.roomAvailable(room.status);
    if (bed.status !== "EMPTY")
      throw new AppError(
        409,
        "TARGET_BED_NOT_AVAILABLE",
        "Giường đích không khả dụng",
      );
    if (await this.requests.findPendingByStudentId(student._id.toString()))
      throw new AppError(
        409,
        "ROOM_CHANGE_REQUEST_ALREADY_PENDING",
        "Sinh viên đã có yêu cầu chuyển phòng chờ xử lý",
      );
    return RoomChangeRequestMapper.toResponse(
      await this.requests.create({
        studentId: student._id.toString(),
        currentContractId: active._id.toString(),
        targetBedId: i.targetBedId,
        reason: i.reason,
        status: "PENDING",
      }),
    );
  }
  async getMyRequests(userId: string) {
    const s = await this.student(userId);
    return (await this.requests.findByStudentId(s._id.toString())).map(
      RoomChangeRequestMapper.toResponse,
    );
  }
  async cancelRequest(userId: string, id: string) {
    const s = await this.student(userId),
      r = await this.requests.findById(id);
    if (!r)
      throw new AppError(
        404,
        "ROOM_CHANGE_REQUEST_NOT_FOUND",
        "Không tìm thấy yêu cầu chuyển phòng",
      );
    if (r.studentId.toString() !== s._id.toString())
      throw new AppError(
        403,
        "FORBIDDEN",
        "Bạn không có quyền thao tác yêu cầu này",
      );
    if (r.status !== "PENDING")
      throw new AppError(
        409,
        "ROOM_CHANGE_REQUEST_NOT_PENDING",
        "Yêu cầu không còn chờ xử lý",
      );
    return RoomChangeRequestMapper.toResponse(
      (await this.requests.updateStatus(id, "CANCELLED"))!,
    );
  }
  async getRequests(q: RoomChangeRequestListQuery) {
    const r = await this.requests.findAll(q);
    const summaries = await this.requests.findDisplaySummaries(r.items.map((item) => item.id));
    return { ...r, items: r.items.map((item) => ({ ...RoomChangeRequestMapper.toResponse(item), ...summaries.get(item.id) })) };
  }
  async getRequestById(id: string) {
    const r = await this.requests.findById(id);
    if (!r)
      throw new AppError(
        404,
        "ROOM_CHANGE_REQUEST_NOT_FOUND",
        "Không tìm thấy yêu cầu chuyển phòng",
      );
    return RoomChangeRequestMapper.toResponse(r);
  }
  async rejectRequest(id: string, adminId: string, reason?: string) {
    const r = await this.requests.findById(id);
    if (!r)
      throw new AppError(
        404,
        "ROOM_CHANGE_REQUEST_NOT_FOUND",
        "Không tìm thấy yêu cầu chuyển phòng",
      );
    if (r.status !== "PENDING")
      throw new AppError(
        409,
        "ROOM_CHANGE_REQUEST_NOT_PENDING",
        "Yêu cầu không còn chờ xử lý",
      );
    return RoomChangeRequestMapper.toResponse(
      (await this.requests.updateStatus(id, "REJECTED", {
        processedBy: adminId,
        processedAt: new Date(),
        rejectReason: reason,
      }))!,
    );
  }
  async approveRequest(id: string, adminId: string) {
    const result = await this.tx.runInTransaction(async (s) => {
      const request = await this.requests.findById(id, s);
      if (!request)
        throw new AppError(
          404,
          "ROOM_CHANGE_REQUEST_NOT_FOUND",
          "Không tìm thấy yêu cầu chuyển phòng",
        );
      if (request.status !== "PENDING")
        throw new AppError(
          409,
          "ROOM_CHANGE_REQUEST_NOT_PENDING",
          "Yêu cầu không còn chờ xử lý",
        );
      const old = await this.contracts.findById(
        request.currentContractId.toString(),
        s,
      );
      if (!old || old.status !== "ACTIVE")
        throw new AppError(
          409,
          "CONTRACT_NOT_ACTIVE",
          "Hợp đồng hiện tại không còn hoạt động",
        );
      if (old.studentId.toString() !== request.studentId.toString())
        throw new AppError(
          409,
          "CONTRACT_NOT_ACTIVE",
          "Hợp đồng hiện tại không thuộc sinh viên",
        );
      const targetBed = await this.beds.findById(
        request.targetBedId.toString(),
        s,
      );
      if (!targetBed)
        throw new AppError(404, "BED_NOT_FOUND", "Không tìm thấy giường đích");
      const targetRoom = await this.rooms.findById(
        targetBed.roomId.toString(),
        s,
      );
      if (!targetRoom)
        throw new AppError(404, "ROOM_NOT_FOUND", "Không tìm thấy phòng đích");
      this.roomAvailable(targetRoom.status);
      if (!(await this.beds.occupyIfEmpty(targetBed._id.toString(), s)))
        throw new AppError(
          409,
          "TARGET_BED_NOT_AVAILABLE",
          "Giường đích không còn khả dụng",
        );
      const oldOwner = await this.contracts.findActiveByBedId(
        old.bedId.toString(),
        s,
      );
      if (!oldOwner || oldOwner._id.toString() !== old._id.toString())
        throw new AppError(
          409,
          "CONTRACT_NOT_ACTIVE",
          "Hợp đồng và giường hiện tại không nhất quán",
        );
      await this.contracts.updateStatus(
        old._id.toString(),
        "ENDED",
        { endedAt: new Date() },
        s,
      );
      if (!(await this.beds.releaseIfOccupied(old.bedId.toString(), s)))
        throw new AppError(
          409,
          "BED_NOT_AVAILABLE",
          "Không thể trả giường hiện tại",
        );
      const oldRoom = await this.rooms.findById(old.roomId.toString(), s);
      if (oldRoom?.status === "FULL")
        await this.rooms.updateStatus(oldRoom._id.toString(), "AVAILABLE", s);
      await this.contracts.create(
        {
          studentId: request.studentId.toString(),
          bedId: targetBed._id.toString(),
          roomId: targetBed.roomId.toString(),
          startDate: new Date(),
          endDate: old.endDate,
          status: "ACTIVE",
          approvedBy: adminId,
          approvedAt: new Date(),
        },
        s,
      );
      if (
        targetRoom.status === "AVAILABLE" &&
        (await this.beds.countEmptyByRoomId(targetRoom._id.toString(), s)) === 0
      )
        await this.rooms.updateStatus(targetRoom._id.toString(), "FULL", s);
      return (await this.requests.updateStatus(
        id,
        "APPROVED",
        { processedBy: adminId, processedAt: new Date() },
        s,
      ))!;
    });
    return RoomChangeRequestMapper.toResponse(result);
  }
}
