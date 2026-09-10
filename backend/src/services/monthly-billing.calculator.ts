import type { TransactionContext } from "../services/transaction-manager.js";
import type { BillingFeeConfig } from "../config/billing-fees.js";
import type { MonthlyBillingDocument } from "../models/monthly-billing.model.js";
import type { IBuildingRepository } from "../repositories/interfaces/building.repository.interface.js";
import type { IContractRepository } from "../repositories/interfaces/contract.repository.interface.js";
import type { IRoomRepository } from "../repositories/interfaces/room.repository.interface.js";
import type { IUtilityReadingRepository } from "../repositories/interfaces/utility-reading.repository.interface.js";
import { AppError } from "../errors/AppError.js";
import {
  allocateExact,
  billingMonthInfo,
  getResidenceOverlapDays,
  prorateRoomFee,
} from "./monthly-billing.rules.js";
import {
  calculateReading,
  currentBillingPeriod,
  nextBillingPeriod,
} from "./utility-reading.rules.js";

export class MonthlyBillingCalculator {
  constructor(
    private rooms: IRoomRepository,
    private buildings: IBuildingRepository,
    private contracts: IContractRepository,
    private readings: IUtilityReadingRepository,
    private fees: BillingFeeConfig,
    private now: () => Date = () => new Date(),
  ) {}

  async calculate(draft: MonthlyBillingDocument, session?: TransactionContext) {
    if (draft.billingPeriod > currentBillingPeriod(this.now())) {
      throw new AppError(
        400,
        "INVALID_BILLING_PERIOD",
        "Không thể lập hóa đơn cho tháng tương lai",
      );
    }
    const room = await this.rooms.findById(draft.roomId.toString(), session);
    if (!room)
      throw new AppError(404, "ROOM_NOT_FOUND", "Không tìm thấy phòng");
    const building = await this.buildings.findById(
      room.buildingId.toString(),
      session,
    );
    if (!building)
      throw new AppError(404, "BUILDING_NOT_FOUND", "Không tìm thấy tòa nhà");

    const samePeriod = await this.readings.findByRoomAndPeriod(
      room.id,
      draft.billingPeriod,
      session,
    );
    if (samePeriod) {
      throw new AppError(
        409,
        "UTILITY_LEDGER_INCONSISTENT",
        "Kỳ này đã có chỉ số chính thức nhưng không thuộc hóa đơn đang xử lý",
      );
    }
    const latest = await this.readings.findLatestByRoom(room.id, session);
    if (latest && draft.billingPeriod <= latest.billingPeriod) {
      throw new AppError(
        409,
        "MONTHLY_BILLING_OUT_OF_ORDER",
        "Kỳ hóa đơn phải sau kỳ đã hoàn tất mới nhất",
      );
    }
    const electricityPrevious =
      latest?.electricityCurrent ?? draft.draftElectricityPrevious;
    const waterPrevious = latest?.waterCurrent ?? draft.draftWaterPrevious;
    let electricity;
    let water;
    try {
      electricity = calculateReading(
        electricityPrevious,
        draft.draftElectricityCurrent,
        this.fees.electricityPerKwh,
      );
      water = calculateReading(
        waterPrevious,
        draft.draftWaterCurrent,
        this.fees.waterPerM3,
      );
    } catch {
      throw new AppError(
        400,
        "INVALID_METER_READING",
        "Chỉ số hiện tại không được nhỏ hơn chỉ số trước",
      );
    }

    const month = billingMonthInfo(draft.billingPeriod);
    const sourceSegments = await this.contracts.findBillingResidenceSegments(
      room.id,
      session,
    );
    const residents = sourceSegments
      .map((segment) => ({
        ...segment,
        residentDays: getResidenceOverlapDays(segment, draft.billingPeriod),
      }))
      .filter((segment) => segment.residentDays > 0)
      .sort((a, b) => a.contractId.localeCompare(b.contractId));
    if (!residents.length) {
      throw new AppError(
        409,
        "MONTHLY_BILLING_NO_RESIDENTS",
        "Không có ngày cư trú hợp lệ trong kỳ hóa đơn",
      );
    }
    const weights = residents.map((resident) => ({
      key: resident.contractId,
      weight: resident.residentDays,
    }));
    const electricityShares = allocateExact(electricity.amount, weights);
    const waterShares = allocateExact(water.amount, weights);
    const wifiShares = allocateExact(this.fees.wifiPerRoomMonth, weights);
    const trashShares = allocateExact(this.fees.trashPerRoomMonth, weights);
    const calculatedResidents = residents.map((resident) => {
      const roomFee = prorateRoomFee(
        resident.roomMonthlyPrice,
        resident.residentDays,
        month.daysInMonth,
      );
      const electricityShare = electricityShares.get(resident.contractId)!;
      const waterShare = waterShares.get(resident.contractId)!;
      const wifiShare = wifiShares.get(resident.contractId)!;
      const trashShare = trashShares.get(resident.contractId)!;
      return {
        ...resident,
        roomFee,
        electricityShare,
        waterShare,
        wifiShare,
        trashShare,
        totalAmount:
          roomFee + electricityShare + waterShare + wifiShare + trashShare,
      };
    });
    const warnings: string[] = [];
    if (
      latest &&
      draft.billingPeriod > nextBillingPeriod(latest.billingPeriod)
    ) {
      warnings.push(
        `Không có bản ghi giữa ${latest.billingPeriod} và ${draft.billingPeriod}; khoảng trống sẽ không thể backfill sau khi finalize.`,
      );
    }

    return {
      room: {
        id: room.id,
        roomNumber: room.roomNumber,
        building: { id: building.id, name: building.name },
      },
      billingPeriod: draft.billingPeriod,
      daysInMonth: month.daysInMonth,
      electricity,
      water,
      wifiFee: this.fees.wifiPerRoomMonth,
      trashFee: this.fees.trashPerRoomMonth,
      sharedServiceTotal:
        electricity.amount +
        water.amount +
        this.fees.wifiPerRoomMonth +
        this.fees.trashPerRoomMonth,
      totalResidentDays: calculatedResidents.reduce(
        (sum, resident) => sum + resident.residentDays,
        0,
      ),
      residents: calculatedResidents,
      totalInvoiceAmount: calculatedResidents.reduce(
        (sum, resident) => sum + resident.totalAmount,
        0,
      ),
      warnings,
    };
  }
}
