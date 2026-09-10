import type { IBuildingRepository } from "../repositories/interfaces/building.repository.interface.js";
import type { IContractRepository } from "../repositories/interfaces/contract.repository.interface.js";
import type { IRoomRepository } from "../repositories/interfaces/room.repository.interface.js";
import type { IStudentRepository } from "../repositories/interfaces/student.repository.interface.js";
import type {
  IUtilityReadingRepository,
  UtilityListQuery,
} from "../repositories/interfaces/utility-reading.repository.interface.js";
import type { ITransactionManager } from "./transaction-manager.js";
import { AppError } from "../errors/AppError.js";
import {
  UtilityReadingMapper,
  type ReadingLike,
} from "../mappers/utility-reading.mapper.js";
import {
  calculateReading,
  currentBillingPeriod,
  getMeterEditRestriction,
  getUnitPriceEditRestriction,
  isMeterAffectingUpdate,
} from "./utility-reading.rules.js";

export type UtilityCreateInput = {
  roomId: string;
  billingPeriod: string;
  electricityPrevious: number;
  electricityCurrent: number;
  electricityUnitPrice: number;
  waterPrevious: number;
  waterCurrent: number;
  waterUnitPrice: number;
};

export type UtilityUpdateInput = Partial<
  Omit<UtilityCreateInput, "roomId" | "billingPeriod">
>;

type AggregatedReading = ReadingLike & {
  roomId: { toString(): string };
  room: { roomNumber: string };
  building: { id: string; name: string };
};

export class UtilityReadingService {
  constructor(
    private readings: IUtilityReadingRepository,
    private rooms: IRoomRepository,
    private buildings: IBuildingRepository,
    private contracts: IContractRepository,
    private students: IStudentRepository,
    private tx: ITransactionManager,
  ) {}

  private calculated(
    electricityPrevious: number,
    electricityCurrent: number,
    electricityUnitPrice: number,
    waterPrevious: number,
    waterCurrent: number,
    waterUnitPrice: number,
  ) {
    try {
      const electricity = calculateReading(
        electricityPrevious,
        electricityCurrent,
        electricityUnitPrice,
      );
      const water = calculateReading(
        waterPrevious,
        waterCurrent,
        waterUnitPrice,
      );

      return {
        electricityPrevious: electricity.previous,
        electricityCurrent: electricity.current,
        electricityUsage: electricity.usage,
        electricityUnitPrice: electricity.unitPrice,
        electricityAmount: electricity.amount,
        waterPrevious: water.previous,
        waterCurrent: water.current,
        waterUsage: water.usage,
        waterUnitPrice: water.unitPrice,
        waterAmount: water.amount,
      };
    } catch {
      throw new AppError(
        400,
        "INVALID_METER_READING",
        "Chỉ số hiện tại phải lớn hơn hoặc bằng chỉ số trước và đơn giá không âm",
      );
    }
  }

  private async roomSummary(roomId: string) {
    const room = await this.rooms.findById(roomId);
    if (!room) {
      throw new AppError(404, "ROOM_NOT_FOUND", "Không tìm thấy phòng");
    }

    const building = await this.buildings.findById(room.buildingId.toString());
    if (!building) {
      throw new AppError(404, "BUILDING_NOT_FOUND", "Không tìm thấy tòa nhà");
    }

    return {
      id: room.id,
      roomNumber: room.roomNumber,
      building: { id: building.id, name: building.name },
    };
  }

  async create(
    _adminId: string,
    _input: UtilityCreateInput,
    _now = new Date(),
  ): Promise<never> {
    throw new AppError(
      409,
      "UTILITY_READING_MANAGED_BY_BILLING",
      "Chỉ số chính thức được tạo khi hoàn tất kỳ hóa đơn",
    );
  }
  async update(_id: string, _input: UtilityUpdateInput): Promise<never> {
    throw new AppError(
      409,
      "UTILITY_READING_MANAGED_BY_BILLING",
      "Chỉ số chính thức được quản lý bởi kỳ hóa đơn",
    );
  }
  async get(id: string) {
    const reading = await this.readings.findById(id);
    if (!reading) {
      throw new AppError(
        404,
        "UTILITY_READING_NOT_FOUND",
        "Không tìm thấy chỉ số điện nước",
      );
    }

    return UtilityReadingMapper.toResponse(
      reading,
      await this.roomSummary(reading.roomId.toString()),
    );
  }

  async list(query: UtilityListQuery) {
    const result = await this.readings.findAll(query);
    return {
      ...result,
      items: result.items.map((raw) => {
        const reading = raw as AggregatedReading;
        return UtilityReadingMapper.toResponse(reading, {
          id: reading.roomId.toString(),
          roomNumber: reading.room.roomNumber,
          building: {
            id: reading.building.id.toString(),
            name: reading.building.name,
          },
        });
      }),
    };
  }

  async mine(userId: string) {
    const student = await this.students.findByUserId(userId);
    if (!student) {
      throw new AppError(404, "STUDENT_NOT_FOUND", "Không tìm thấy sinh viên");
    }

    const contract = await this.contracts.findActiveByStudentId(student.id);
    if (!contract) return { items: [] };

    const room = await this.roomSummary(contract.roomId.toString());
    const readings = await this.readings.findByRoom(contract.roomId.toString());
    return {
      items: readings.map((reading) =>
        UtilityReadingMapper.toResponse(reading, room),
      ),
    };
  }
}
