export type ReadingLike = {
  id: string;
  billingPeriod: string;
  electricityPrevious: number;
  electricityCurrent: number;
  electricityUsage: number;
  electricityUnitPrice: number;
  electricityAmount: number;
  waterPrevious: number;
  waterCurrent: number;
  waterUsage: number;
  waterUnitPrice: number;
  waterAmount: number;
};

type RoomSummary = {
  id: string;
  roomNumber: string;
  building: { id: string; name: string };
};

export class UtilityReadingMapper {
  static toResponse(reading: ReadingLike, room: RoomSummary) {
    return {
      id: reading.id,
      billingPeriod: reading.billingPeriod,
      room,
      electricity: {
        previous: reading.electricityPrevious,
        current: reading.electricityCurrent,
        usage: reading.electricityUsage,
        unitPrice: reading.electricityUnitPrice,
        amount: reading.electricityAmount,
      },
      water: {
        previous: reading.waterPrevious,
        current: reading.waterCurrent,
        usage: reading.waterUsage,
        unitPrice: reading.waterUnitPrice,
        amount: reading.waterAmount,
      },
      totalUtilityAmount: reading.electricityAmount + reading.waterAmount,
    };
  }
}
