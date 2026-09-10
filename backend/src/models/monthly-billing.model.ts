export const MONTHLY_BILLING_STATUSES = [
  "DRAFT",
  "FINALIZED",
  "CANCELLED",
] as const;
export type MonthlyBillingStatus = (typeof MONTHLY_BILLING_STATUSES)[number];

export interface MonthlyBilling {
  roomId: string;
  billingPeriod: string;
  status: MonthlyBillingStatus;
  draftElectricityPrevious: number;
  draftElectricityCurrent: number;
  draftWaterPrevious: number;
  draftWaterCurrent: number;
  utilityReadingId?: string;
  buildingNameSnapshot?: string;
  roomNumberSnapshot?: string;
  electricityPrevious?: number;
  electricityCurrent?: number;
  electricityUsage?: number;
  electricityUnitPrice?: number;
  electricityAmount?: number;
  waterPrevious?: number;
  waterCurrent?: number;
  waterUsage?: number;
  waterUnitPrice?: number;
  waterAmount?: number;
  wifiFee?: number;
  trashFee?: number;
  sharedServiceTotal?: number;
  totalInvoiceAmount?: number;
  finalizedBy?: string;
  finalizedAt?: Date;
  cancelledBy?: string;
  cancelledAt?: Date;
  cancelReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type MonthlyBillingDocument = MonthlyBilling & { id: string };
