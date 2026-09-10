import type {
  IRoomChangeRequestRepository,
  RoomChangeRequestListQuery,
} from "../repositories/interfaces/room-change-request.repository.interface.js";
import type { IContractRepository } from "../repositories/interfaces/contract.repository.interface.js";
import type { IStudentRepository } from "../repositories/interfaces/student.repository.interface.js";
import type { IBedRepository } from "../repositories/interfaces/bed.repository.interface.js";
import type { IRoomRepository } from "../repositories/interfaces/room.repository.interface.js";
import type { IBuildingRepository } from "../repositories/interfaces/building.repository.interface.js";
import type { ITransactionManager } from "./transaction-manager.js";
import { AppError } from "../errors/AppError.js";
import { RoomChangeRequestMapper } from "../mappers/room-change-request.mapper.js";
import type { ICheckoutRequestRepository } from "../repositories/interfaces/checkout-request.repository.interface.js";
import { assertPlacementAllowed } from "./building-placement.js";
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
    private checkoutRequests: ICheckoutRequestRepository,
    private buildings?: IBuildingRepository,
  ) {}
  private async placementAllowed(studentId: string, buildingId: string, s?: Parameters<IBuildingRepository["findById"]>[1]) {
    if (!this.buildings) return;
    const [student, building] = await Promise.all([
      this.students.findById(studentId, s),
      this.buildings.findById(buildingId, s),
    ]);
    if (!student) throw new AppError(404, "STUDENT_NOT_FOUND", "Không tìm thấy sinh viên");
    if (!building) throw new AppError(404, "BUILDING_NOT_FOUND", "Không tìm thấy tòa nhà");
    assertPlacementAllowed(student, building);
  }
  private async student(userId: string) {
    const s = await this.students.findByUserId(userId);
    if (!s)
      throw new AppError(404, "STUDENT_NOT_FOUND", "Không tìm thấy sinh viên");
    return s;
  }
  private roomAvailable(status: string) {
    if (status !== "AVAILABLE")
      throw new AppError(
        409,
        "ROOM_NOT_AVAILABLE",
        "Phòng hiện không khả dụng",
      );
  }
  private async responses(
    items: Parameters<typeof RoomChangeRequestMapper.toResponse>[0][],
  ) {
    const summaries = await this.requests.findDisplaySummaries(
      items.map((item) => item.id),
    );
    return items.map((item) => ({
      ...RoomChangeRequestMapper.toResponse(item),
      ...summaries.get(item.id),
    }));
  }
  private async response(
    item: Parameters<typeof RoomChangeRequestMapper.toResponse>[0],
  ) {
    return (await this.responses([item]))[0]!;
  }
  async createRequest(userId: string, i: CreateRoomChangeRequestInput) {
    const student = await this.student(userId);
    const studentId = student.id;
    const created = await this.tx.runInTransaction(async (s) => {
      await this.students.lockResidenceIntent(studentId, s);
      const active = await this.contracts.findActiveByStudentId(studentId, s);
      if (!active)
        throw new AppError(
          409,
          "NO_ACTIVE_CONTRACT",
          "Sinh viên chưa có hợp đồng đang hoạt động",
        );
      if (await this.checkoutRequests.findPendingByStudentId(studentId, s))
        throw new AppError(
          409,
          "CONFLICTING_PENDING_REQUEST",
          "Hãy hủy yêu cầu trả phòng trước khi yêu cầu chuyển phòng",
        );
      const bed = await this.beds.findById(i.targetBedId, s);
      if (!bed)
        throw new AppError(404, "BED_NOT_FOUND", "Không tìm thấy giường");
      if (active.bedId.toString() === i.targetBedId)
        throw new AppError(
          400,
          "SAME_BED",
          "Giường đích trùng với giường hiện tại",
        );
      const room = await this.rooms.findById(bed.roomId.toString(), s);
      if (!room)
        throw new AppError(404, "ROOM_NOT_FOUND", "Không tìm thấy phòng");
      await this.placementAllowed(studentId, room.buildingId, s);
      this.roomAvailable(room.status);
      if (active.roomId.toString() === room.id)
        throw new AppError(
          409,
          "INVALID_ROOM_CHANGE_TARGET",
          "Phòng đích trùng với phòng hiện tại",
        );
      if (bed.status !== "EMPTY")
        throw new AppError(
          409,
          "TARGET_BED_NOT_AVAILABLE",
          "Giường đích không khả dụng",
        );
      if (await this.requests.findPendingByStudentId(studentId, s))
        throw new AppError(
          409,
          "ROOM_CHANGE_REQUEST_ALREADY_PENDING",
          "Sinh viên đã có yêu cầu chuyển phòng chờ xử lý",
        );
      return this.requests.create(
        {
          studentId,
          currentContractId: active.id,
          targetBedId: i.targetBedId,
          reason: i.reason,
          status: "PENDING",
        },
        s,
      );
    });
    return this.response(created);
  }
  async getMyRequests(userId: string) {
    const s = await this.student(userId);
    return this.responses(await this.requests.findByStudentId(s.id.toString()));
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
    if (r.studentId.toString() !== s.id.toString())
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
    return this.response((await this.requests.updateStatus(id, "CANCELLED"))!);
  }
  async getRequests(q: RoomChangeRequestListQuery) {
    const r = await this.requests.findAll(q);
    return { ...r, items: await this.responses(r.items) };
  }
  async getRequestById(id: string) {
    const r = await this.requests.findById(id);
    if (!r)
      throw new AppError(
        404,
        "ROOM_CHANGE_REQUEST_NOT_FOUND",
        "Không tìm thấy yêu cầu chuyển phòng",
      );
    return this.response(r);
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
    return this.response(
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
      await this.placementAllowed(request.studentId, targetRoom.buildingId, s);
      this.roomAvailable(targetRoom.status);
      if (old.roomId.toString() === targetRoom.id.toString())
        throw new AppError(
          409,
          "INVALID_ROOM_CHANGE_TARGET",
          "Phòng đích trùng với phòng hiện tại",
        );
      if (!(await this.beds.occupyIfEmpty(targetBed.id.toString(), s)))
        throw new AppError(
          409,
          "TARGET_BED_NOT_AVAILABLE",
          "Giường đích không còn khả dụng",
        );
      const oldOwner = await this.contracts.findActiveByBedId(
        old.bedId.toString(),
        s,
      );
      if (!oldOwner || oldOwner.id.toString() !== old.id.toString())
        throw new AppError(
          409,
          "CONTRACT_NOT_ACTIVE",
          "Hợp đồng và giường hiện tại không nhất quán",
        );
      await this.contracts.updateStatus(
        old.id.toString(),
        "ENDED",
        { endedAt: new Date() },
        s,
      );
      await this.checkoutRequests.cancelPendingByContractId(
        old.id,
        "Yêu cầu đã tự động hủy do chuyển phòng được duyệt.",
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
        await this.rooms.updateStatus(oldRoom.id.toString(), "AVAILABLE", s);
      await this.contracts.create(
        {
          studentId: request.studentId.toString(),
          bedId: targetBed.id.toString(),
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
        (await this.beds.countEmptyByRoomId(targetRoom.id.toString(), s)) === 0
      )
        await this.rooms.updateStatus(targetRoom.id.toString(), "FULL", s);
      return (await this.requests.updateStatus(
        id,
        "APPROVED",
        { processedBy: adminId, processedAt: new Date() },
        s,
      ))!;
    });
    return this.response(result);
  }
}
