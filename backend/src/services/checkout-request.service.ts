import type {
  ICheckoutRequestRepository,
  CheckoutListQuery,
} from "../repositories/interfaces/checkout-request.repository.interface.js";
import type { IContractRepository } from "../repositories/interfaces/contract.repository.interface.js";
import type { IStudentRepository } from "../repositories/interfaces/student.repository.interface.js";
import type { IRoomChangeRequestRepository } from "../repositories/interfaces/room-change-request.repository.interface.js";
import type { IBedRepository } from "../repositories/interfaces/bed.repository.interface.js";
import type { IRoomRepository } from "../repositories/interfaces/room.repository.interface.js";
import type { ITransactionManager } from "./transaction-manager.js";
import { CheckoutRequestMapper } from "../mappers/checkout-request.mapper.js";
import { AppError } from "../errors/AppError.js";
export class CheckoutRequestService {
  constructor(
    private requests: ICheckoutRequestRepository,
    private contracts: IContractRepository,
    private students: IStudentRepository,
    private roomChanges: IRoomChangeRequestRepository,
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
  private async responses(
    items: Parameters<typeof CheckoutRequestMapper.toResponse>[0][],
  ) {
    const summaries = await this.requests.findSummaries(items.map((x) => x.id));
    return items.map((x) => ({
      ...CheckoutRequestMapper.toResponse(x),
      ...summaries.get(x.id),
    }));
  }
  private async response(
    item: Parameters<typeof CheckoutRequestMapper.toResponse>[0],
  ) {
    return (await this.responses([item]))[0]!;
  }
  async create(userId: string, reason?: string) {
    const student = await this.student(userId);
    const studentId = student.id;
    const created = await this.tx.runInTransaction(async (s) => {
      await this.students.lockResidenceIntent(studentId, s);
      const contract = await this.contracts.findActiveByStudentId(studentId, s);
      if (!contract)
        throw new AppError(409, "NO_ACTIVE_CONTRACT", "Sinh viên chưa có hợp đồng đang hoạt động");
      if (await this.requests.findPendingByStudentId(studentId, s))
        throw new AppError(409, "CHECKOUT_REQUEST_ALREADY_PENDING", "Đã có yêu cầu trả phòng đang chờ xử lý");
      if (await this.roomChanges.findPendingByStudentId(studentId, s))
        throw new AppError(409, "CONFLICTING_PENDING_REQUEST", "Hãy hủy yêu cầu chuyển phòng trước khi trả phòng");
      return this.requests.create({
        studentId,
        contractId: contract.id,
        roomId: contract.roomId.toString(),
        reason,
        status: "PENDING",
      }, s);
    });
    return this.response(created);
  }
  async mine(userId: string) {
    const student = await this.student(userId);
    return this.responses(await this.requests.findByStudentId(student.id));
  }
  async cancel(userId: string, id: string) {
    const student = await this.student(userId);
    const request = await this.requests.findById(id);
    if (!request || request.studentId.toString() !== student.id)
      throw new AppError(
        404,
        "CHECKOUT_REQUEST_NOT_FOUND",
        "Không tìm thấy yêu cầu trả phòng",
      );
    const updated = await this.requests.updatePending(id, "CANCELLED", {
      cancelReason: "Đã hủy bởi sinh viên",
      processedAt: new Date(),
    });
    if (!updated)
      throw new AppError(
        409,
        "CHECKOUT_REQUEST_NOT_PENDING",
        "Yêu cầu không còn chờ xử lý",
      );
    return this.response(updated);
  }
  async list(q: CheckoutListQuery) {
    const result = await this.requests.findAll(q);
    return { ...result, items: await this.responses(result.items) };
  }
  async get(id: string) {
    const request = await this.requests.findById(id);
    if (!request)
      throw new AppError(
        404,
        "CHECKOUT_REQUEST_NOT_FOUND",
        "Không tìm thấy yêu cầu trả phòng",
      );
    return this.response(request);
  }
  async reject(id: string, adminId: string, rejectReason?: string) {
    const updated = await this.requests.updatePending(id, "REJECTED", {
      processedBy: adminId,
      processedAt: new Date(),
      rejectReason,
    });
    if (!updated) {
      if (!(await this.requests.findById(id)))
        throw new AppError(
          404,
          "CHECKOUT_REQUEST_NOT_FOUND",
          "Không tìm thấy yêu cầu trả phòng",
        );
      throw new AppError(
        409,
        "CHECKOUT_REQUEST_NOT_PENDING",
        "Yêu cầu không còn chờ xử lý",
      );
    }
    return this.response(updated);
  }
  async approve(id: string, adminId: string) {
    const result = await this.tx.runInTransaction(async (s) => {
      const request = await this.requests.findById(id, s);
      if (!request)
        throw new AppError(
          404,
          "CHECKOUT_REQUEST_NOT_FOUND",
          "Không tìm thấy yêu cầu trả phòng",
        );
      if (request.status !== "PENDING")
        throw new AppError(
          409,
          "CHECKOUT_REQUEST_NOT_PENDING",
          "Yêu cầu không còn chờ xử lý",
        );
      const contract = await this.contracts.findById(
        request.contractId.toString(),
        s,
      );
      if (
        !contract ||
        contract.status !== "ACTIVE" ||
        contract.studentId.toString() !== request.studentId.toString()
      )
        throw new AppError(
          409,
          "CONTRACT_NOT_ACTIVE",
          "Hợp đồng liên quan không còn hoạt động",
        );
      if (contract.roomId.toString() !== request.roomId.toString())
        throw new AppError(
          409,
          "CONTRACT_ROOM_MISMATCH",
          "Phòng yêu cầu không khớp hợp đồng",
        );
      const owner = await this.contracts.findActiveByBedId(
        contract.bedId.toString(),
        s,
      );
      if (!owner || owner.id !== contract.id)
        throw new AppError(
          409,
          "BED_NOT_OCCUPIED",
          "Giường và hợp đồng không nhất quán",
        );
      const room = await this.rooms.findById(contract.roomId.toString(), s);
      await this.contracts.updateStatus(
        contract.id,
        "ENDED",
        { endedAt: new Date() },
        s,
      );
      if (!(await this.beds.releaseIfOccupied(contract.bedId.toString(), s)))
        throw new AppError(
          409,
          "BED_NOT_OCCUPIED",
          "Giường không ở trạng thái đang sử dụng",
        );
      if (room?.status === "FULL")
        await this.rooms.updateStatus(room.id, "AVAILABLE", s);
      const approved = await this.requests.updatePending(
        id,
        "APPROVED",
        { processedBy: adminId, processedAt: new Date() },
        s,
      );
      if (!approved)
        throw new AppError(
          409,
          "CHECKOUT_REQUEST_NOT_PENDING",
          "Yêu cầu không còn chờ xử lý",
        );
      return approved;
    });
    return this.response(result);
  }
}
