import type { IBuildingRepository } from "../repositories/interfaces/building.repository.interface.js";
import type { IInvoiceRepository } from "../repositories/interfaces/invoice.repository.interface.js";
import type {
  IMonthlyBillingRepository,
  MonthlyBillingListQuery,
} from "../repositories/interfaces/monthly-billing.repository.interface.js";
import type { IRoomBillingCursorRepository } from "../repositories/interfaces/room-billing-cursor.repository.interface.js";
import type { IRoomRepository } from "../repositories/interfaces/room.repository.interface.js";
import type { IStudentRepository } from "../repositories/interfaces/student.repository.interface.js";
import type { ITransactionManager } from "./transaction-manager.js";
import type { IUtilityReadingRepository } from "../repositories/interfaces/utility-reading.repository.interface.js";
import { AppError } from "../errors/AppError.js";
import { mapInvoice, mapMonthlyBilling } from "../mappers/billing.mapper.js";
import {
  calculateReading,
  currentBillingPeriod,
} from "./utility-reading.rules.js";
import { MonthlyBillingCalculator } from "./monthly-billing.calculator.js";

export type SaveBillingDraftInput = {
  roomId: string;
  billingPeriod: string;
  electricityCurrent: number;
  waterCurrent: number;
  electricityPrevious?: number;
  waterPrevious?: number;
};

export class MonthlyBillingService {
  constructor(
    private billings: IMonthlyBillingRepository,
    private cursors: IRoomBillingCursorRepository,
    private invoices: IInvoiceRepository,
    private readings: IUtilityReadingRepository,
    private rooms: IRoomRepository,
    private buildings: IBuildingRepository,
    private students: IStudentRepository,
    private calculator: MonthlyBillingCalculator,
    private tx: ITransactionManager,
  ) {}

  private assertLedger(
    cursorPeriod: string | null,
    latestReadingPeriod: string | undefined,
  ) {
    if (cursorPeriod !== (latestReadingPeriod ?? null)) {
      throw new AppError(
        409,
        "UTILITY_LEDGER_INCONSISTENT",
        "Chỉ số điện nước cũ chưa được liên kết với workflow hóa đơn; cần audit dữ liệu trước khi tiếp tục",
      );
    }
  }

  private async roomSummary(roomId: string) {
    const room = await this.rooms.findById(roomId);
    if (!room)
      throw new AppError(404, "ROOM_NOT_FOUND", "Không tìm thấy phòng");
    const building = await this.buildings.findById(room.buildingId.toString());
    if (!building)
      throw new AppError(404, "BUILDING_NOT_FOUND", "Không tìm thấy tòa nhà");
    return {
      id: room.id,
      roomNumber: room.roomNumber,
      building: { id: building.id, name: building.name },
    };
  }

  async saveDraft(input: SaveBillingDraftInput, now = new Date()) {
    if (input.billingPeriod > currentBillingPeriod(now)) {
      throw new AppError(
        400,
        "INVALID_BILLING_PERIOD",
        "Không thể lập hóa đơn cho tháng tương lai",
      );
    }
    if (!(await this.rooms.findById(input.roomId))) {
      throw new AppError(404, "ROOM_NOT_FOUND", "Không tìm thấy phòng");
    }
    const existing = await this.billings.findByRoomAndPeriod(
      input.roomId,
      input.billingPeriod,
    );
    if (existing?.status === "FINALIZED") {
      throw new AppError(
        409,
        "MONTHLY_BILLING_ALREADY_FINALIZED",
        "Kỳ hóa đơn đã được hoàn tất",
      );
    }
    if (existing?.status === "CANCELLED") {
      throw new AppError(
        409,
        "MONTHLY_BILLING_CANCELLED",
        "Kỳ hóa đơn đã hủy và không thể tạo lại trong v1",
      );
    }
    const latest = await this.readings.findLatestByRoom(input.roomId);
    const foundCursor = await this.cursors.findByRoom(input.roomId);
    if (!foundCursor && latest) {
      throw new AppError(
        409,
        "UTILITY_LEDGER_INCONSISTENT",
        "Phòng có chỉ số legacy nhưng chưa có billing cursor; cần audit dữ liệu, hệ thống không tự động chuyển đổi",
      );
    }
    const cursor =
      foundCursor ?? (await this.cursors.ensureForRoom(input.roomId));
    this.assertLedger(
      cursor.latestFinalizedBillingPeriod,
      latest?.billingPeriod,
    );
    if (
      cursor.latestFinalizedBillingPeriod &&
      input.billingPeriod <= cursor.latestFinalizedBillingPeriod
    ) {
      throw new AppError(
        409,
        "MONTHLY_BILLING_OUT_OF_ORDER",
        "Kỳ hóa đơn phải sau kỳ đã hoàn tất mới nhất",
      );
    }
    const electricityPrevious =
      latest?.electricityCurrent ?? input.electricityPrevious;
    const waterPrevious = latest?.waterCurrent ?? input.waterPrevious;
    if (
      latest &&
      ((input.electricityPrevious !== undefined &&
        input.electricityPrevious !== electricityPrevious) ||
        (input.waterPrevious !== undefined &&
          input.waterPrevious !== waterPrevious))
    ) {
      throw new AppError(
        409,
        "METER_PREVIOUS_MISMATCH",
        "Chỉ số kỳ trước do hệ thống lấy từ kỳ đã hoàn tất mới nhất",
      );
    }
    if (electricityPrevious === undefined || waterPrevious === undefined) {
      throw new AppError(
        400,
        "METER_BASELINE_REQUIRED",
        "Kỳ đầu tiên cần chỉ số điện và nước ban đầu",
      );
    }
    try {
      calculateReading(electricityPrevious, input.electricityCurrent, 0);
      calculateReading(waterPrevious, input.waterCurrent, 0);
    } catch {
      throw new AppError(
        400,
        "INVALID_METER_READING",
        "Chỉ số hiện tại không được nhỏ hơn chỉ số trước",
      );
    }
    const draft = await this.billings.upsertDraft(
      input.roomId,
      input.billingPeriod,
      {
        draftElectricityPrevious: electricityPrevious,
        draftElectricityCurrent: input.electricityCurrent,
        draftWaterPrevious: waterPrevious,
        draftWaterCurrent: input.waterCurrent,
      },
    );
    if (!draft)
      throw new AppError(
        409,
        "MONTHLY_BILLING_NOT_DRAFT",
        "Kỳ hóa đơn không còn ở trạng thái nháp",
      );
    return mapMonthlyBilling(draft, await this.roomSummary(input.roomId));
  }

  async preview(id: string) {
    const draft = await this.billings.findById(id);
    if (!draft)
      throw new AppError(
        404,
        "MONTHLY_BILLING_NOT_FOUND",
        "Không tìm thấy kỳ hóa đơn",
      );
    if (draft.status !== "DRAFT") {
      throw new AppError(
        409,
        "MONTHLY_BILLING_NOT_DRAFT",
        "Chỉ kỳ nháp mới có thể preview",
      );
    }
    return this.calculator.calculate(draft);
  }

  async finalize(id: string, adminId: string) {
    const billingId = await this.tx.runInTransaction(async (session) => {
      let draft = await this.billings.findById(id, session);
      if (!draft)
        throw new AppError(
          404,
          "MONTHLY_BILLING_NOT_FOUND",
          "Không tìm thấy kỳ hóa đơn",
        );
      if (draft.status === "FINALIZED") {
        throw new AppError(
          409,
          "MONTHLY_BILLING_ALREADY_FINALIZED",
          "Kỳ hóa đơn đã được hoàn tất",
        );
      }
      if (draft.status !== "DRAFT") {
        throw new AppError(
          409,
          "MONTHLY_BILLING_NOT_DRAFT",
          "Kỳ hóa đơn không còn ở trạng thái nháp",
        );
      }
      await this.rooms.lockUtilityLedger(draft.roomId.toString(), session);
      draft = await this.billings.findById(id, session);
      if (!draft || draft.status !== "DRAFT") {
        throw new AppError(
          409,
          "MONTHLY_BILLING_NOT_DRAFT",
          "Kỳ hóa đơn không còn ở trạng thái nháp",
        );
      }
      const cursor = await this.cursors.findByRoom(
        draft.roomId.toString(),
        session,
      );
      if (!cursor) {
        throw new AppError(
          409,
          "BILLING_CONCURRENT_MODIFICATION",
          "Billing cursor chưa được khởi tạo",
        );
      }
      const latest = await this.readings.findLatestByRoom(
        draft.roomId.toString(),
        session,
      );
      this.assertLedger(
        cursor.latestFinalizedBillingPeriod,
        latest?.billingPeriod,
      );
      if (
        cursor.latestFinalizedBillingPeriod &&
        draft.billingPeriod <= cursor.latestFinalizedBillingPeriod
      ) {
        throw new AppError(
          409,
          "MONTHLY_BILLING_OUT_OF_ORDER",
          "Kỳ hóa đơn phải sau kỳ đã hoàn tất mới nhất",
        );
      }
      const calculated = await this.calculator.calculate(draft, session);
      if (
        !(await this.cursors.advance(
          draft.roomId.toString(),
          cursor.latestFinalizedBillingPeriod,
          draft.billingPeriod,
          session,
        ))
      ) {
        throw new AppError(
          409,
          "BILLING_CONCURRENT_MODIFICATION",
          "Có thao tác finalize đồng thời; vui lòng thử lại",
        );
      }
      const reading = await this.readings.create(
        {
          roomId: draft.roomId,
          monthlyBillingId: draft.id,
          billingPeriod: draft.billingPeriod,
          electricityPrevious: calculated.electricity.previous,
          electricityCurrent: calculated.electricity.current,
          electricityUsage: calculated.electricity.usage,
          electricityUnitPrice: calculated.electricity.unitPrice,
          electricityAmount: calculated.electricity.amount,
          waterPrevious: calculated.water.previous,
          waterCurrent: calculated.water.current,
          waterUsage: calculated.water.usage,
          waterUnitPrice: calculated.water.unitPrice,
          waterAmount: calculated.water.amount,
          recordedBy: adminId,
        },
        session,
      );
      const finalized = await this.billings.finalizeDraft(
        id,
        {
          utilityReadingId: reading.id,
          buildingNameSnapshot: calculated.room.building.name,
          roomNumberSnapshot: calculated.room.roomNumber,
          electricityPrevious: calculated.electricity.previous,
          electricityCurrent: calculated.electricity.current,
          electricityUsage: calculated.electricity.usage,
          electricityUnitPrice: calculated.electricity.unitPrice,
          electricityAmount: calculated.electricity.amount,
          waterPrevious: calculated.water.previous,
          waterCurrent: calculated.water.current,
          waterUsage: calculated.water.usage,
          waterUnitPrice: calculated.water.unitPrice,
          waterAmount: calculated.water.amount,
          wifiFee: calculated.wifiFee,
          trashFee: calculated.trashFee,
          sharedServiceTotal: calculated.sharedServiceTotal,
          totalInvoiceAmount: calculated.totalInvoiceAmount,
          finalizedBy: adminId,
          finalizedAt: new Date(),
        },
        session,
      );
      if (!finalized)
        throw new AppError(
          409,
          "MONTHLY_BILLING_NOT_DRAFT",
          "Kỳ hóa đơn không còn ở trạng thái nháp",
        );
      const createdInvoices = await this.invoices.createMany(
        calculated.residents.map((resident) => ({
          monthlyBillingId: finalized.id,
          studentId: resident.studentId,
          contractId: resident.contractId,
          billingPeriod: draft!.billingPeriod,
          status: "UNPAID",
          buildingNameSnapshot: calculated.room.building.name,
          roomNumberSnapshot: calculated.room.roomNumber,
          studentFullNameSnapshot: resident.fullName,
          mssvSnapshot: resident.mssv,
          residentDays: resident.residentDays,
          daysInMonth: calculated.daysInMonth,
          roomMonthlyPrice: resident.roomMonthlyPrice,
          roomFee: resident.roomFee,
          electricityShare: resident.electricityShare,
          waterShare: resident.waterShare,
          wifiShare: resident.wifiShare,
          trashShare: resident.trashShare,
          totalAmount: resident.totalAmount,
        })),
        session,
      );
      await this.invoices.createItems(
        createdInvoices.flatMap((invoice, index) => {
          const resident = calculated.residents[index]!;
          const sharedNote = `${resident.residentDays}/${calculated.totalResidentDays} resident-days`;
          return [
            {
              invoiceId: invoice.id,
              type: "ROOM_FEE",
              description: "Tiền phòng",
              amount: resident.roomFee,
              calculationNote: `${resident.roomMonthlyPrice} × ${resident.residentDays}/${calculated.daysInMonth} ngày`,
            },
            {
              invoiceId: invoice.id,
              type: "ELECTRICITY",
              description: "Điện",
              amount: resident.electricityShare,
              calculationNote: sharedNote,
            },
            {
              invoiceId: invoice.id,
              type: "WATER",
              description: "Nước",
              amount: resident.waterShare,
              calculationNote: sharedNote,
            },
            {
              invoiceId: invoice.id,
              type: "WIFI",
              description: "WiFi",
              amount: resident.wifiShare,
              calculationNote: sharedNote,
            },
            {
              invoiceId: invoice.id,
              type: "TRASH",
              description: "Rác",
              amount: resident.trashShare,
              calculationNote: sharedNote,
            },
          ];
        }),
        session,
      );
      return finalized.id;
    });
    return this.get(billingId);
  }

  async cancel(id: string, adminId: string, reason?: string) {
    await this.tx.runInTransaction(async (session) => {
      const billing = await this.billings.findById(id, session);
      if (!billing)
        throw new AppError(
          404,
          "MONTHLY_BILLING_NOT_FOUND",
          "Không tìm thấy kỳ hóa đơn",
        );
      if (billing.status === "CANCELLED") {
        throw new AppError(
          409,
          "MONTHLY_BILLING_CANCELLED",
          "Kỳ hóa đơn đã bị hủy",
        );
      }
      if (billing.status !== "FINALIZED") {
        throw new AppError(
          409,
          "MONTHLY_BILLING_NOT_DRAFT",
          "Chỉ kỳ đã hoàn tất mới có thể hủy",
        );
      }
      if (!(await this.billings.cancel(id, adminId, reason, session))) {
        throw new AppError(
          409,
          "BILLING_CONCURRENT_MODIFICATION",
          "Trạng thái kỳ hóa đơn vừa thay đổi",
        );
      }
      if (await this.invoices.lockAndHasConfirmedPayments(id, session)) {
        throw new AppError(
          409,
          "BILLING_HAS_CONFIRMED_PAYMENTS",
          "Kỳ hóa đơn có thanh toán đã xác nhận; không thể hủy",
        );
      }
      await this.invoices.cancelByMonthlyBilling(id, session);
    });
    return this.get(id);
  }

  async list(query: MonthlyBillingListQuery) {
    const result = await this.billings.findAll(query);
    return {
      ...result,
      items: result.items.map((item) => mapMonthlyBilling(item)),
    };
  }

  async get(id: string) {
    const billing = await this.billings.findById(id);
    if (!billing)
      throw new AppError(
        404,
        "MONTHLY_BILLING_NOT_FOUND",
        "Không tìm thấy kỳ hóa đơn",
      );
    const currentRoom = await this.roomSummary(billing.roomId.toString());
    const room =
      billing.status === "DRAFT"
        ? currentRoom
        : {
            ...currentRoom,
            roomNumber: billing.roomNumberSnapshot ?? currentRoom.roomNumber,
            building: {
              ...currentRoom.building,
              name: billing.buildingNameSnapshot ?? currentRoom.building.name,
            },
          };
    const invoices = await this.invoices.findByMonthlyBilling(id);
    return {
      ...mapMonthlyBilling(billing, room),
      invoices: invoices.map((invoice) => mapInvoice(invoice)),
    };
  }

  async myInvoices(
    userId: string,
    query: { page: number; limit: number; billingPeriod?: string },
  ) {
    const student = await this.students.findByUserId(userId);
    if (!student)
      throw new AppError(404, "STUDENT_NOT_FOUND", "Không tìm thấy sinh viên");
    const result = await this.invoices.findByStudent(student.id, query);
    return {
      ...result,
      items: result.items.map((invoice) => mapInvoice(invoice)),
    };
  }

  async myInvoice(userId: string, invoiceId: string) {
    const student = await this.students.findByUserId(userId);
    if (!student)
      throw new AppError(404, "STUDENT_NOT_FOUND", "Không tìm thấy sinh viên");
    const invoice = await this.invoices.findByIdForStudent(
      invoiceId,
      student.id,
    );
    if (!invoice)
      throw new AppError(404, "INVOICE_NOT_FOUND", "Không tìm thấy hóa đơn");
    return mapInvoice(invoice, await this.invoices.findItems(invoice.id));
  }
}
