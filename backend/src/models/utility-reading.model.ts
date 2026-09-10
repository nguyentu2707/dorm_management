export interface UtilityReading {
  monthlyBillingId: string;
  roomId: string;
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
  recordedBy: string;
  createdAt: Date;
  updatedAt: Date;
}
export type UtilityReadingDocument = UtilityReading & { id: string };
