import type { InvoiceDocument } from "../models/invoice.model.js";
import type { InvoiceItemDocument } from "../models/invoice-item.model.js";
import type { MonthlyBillingDocument } from "../models/monthly-billing.model.js";

export const mapInvoice = (
  invoice: InvoiceDocument,
  items?: InvoiceItemDocument[],
) => ({
  id: invoice.id,
  monthlyBillingId: invoice.monthlyBillingId.toString(),
  studentId: invoice.studentId.toString(),
  contractId: invoice.contractId.toString(),
  billingPeriod: invoice.billingPeriod,
  status: invoice.status,
  room: {
    buildingName: invoice.buildingNameSnapshot,
    roomNumber: invoice.roomNumberSnapshot,
  },
  student: {
    fullName: invoice.studentFullNameSnapshot,
    mssv: invoice.mssvSnapshot,
  },
  residentDays: invoice.residentDays,
  daysInMonth: invoice.daysInMonth,
  roomMonthlyPrice: invoice.roomMonthlyPrice,
  roomFee: invoice.roomFee,
  electricityShare: invoice.electricityShare,
  waterShare: invoice.waterShare,
  wifiShare: invoice.wifiShare,
  trashShare: invoice.trashShare,
  totalAmount: invoice.totalAmount,
  paidAmount: invoice.paidAmount ?? 0,
  remainingAmount: invoice.totalAmount - (invoice.paidAmount ?? 0),
  pendingAmount: invoice.pendingAmount ?? 0,
  paymentStatus: invoice.status,
  ...(items
    ? {
        items: items.map((item) => ({
          id: item.id,
          type: item.type,
          description: item.description,
          amount: item.amount,
          calculationNote: item.calculationNote,
        })),
      }
    : {}),
  createdAt: invoice.createdAt,
});

export const mapMonthlyBilling = (
  billing: MonthlyBillingDocument | Record<string, any>,
  room?: {
    id: string;
    roomNumber: string;
    building: { id: string; name: string };
  },
) => {
  const raw = billing as Record<string, any>;
  return {
    id: billing.id ?? billing.id.toString(),
    billingPeriod: billing.billingPeriod,
    status: billing.status,
    room: room ?? {
      id: billing.roomId.toString(),
      roomNumber: billing.roomNumberSnapshot ?? raw.room?.roomNumber ?? "—",
      building: {
        id: raw.building?.id?.toString?.() ?? "",
        name: billing.buildingNameSnapshot ?? raw.building?.name ?? "—",
      },
    },
    draft: {
      electricityPrevious: billing.draftElectricityPrevious,
      electricityCurrent: billing.draftElectricityCurrent,
      waterPrevious: billing.draftWaterPrevious,
      waterCurrent: billing.draftWaterCurrent,
    },
    utilityReadingId: billing.utilityReadingId?.toString(),
    electricity:
      billing.electricityUsage === undefined
        ? undefined
        : {
            previous: billing.electricityPrevious,
            current: billing.electricityCurrent,
            usage: billing.electricityUsage,
            unitPrice: billing.electricityUnitPrice,
            amount: billing.electricityAmount,
          },
    water:
      billing.waterUsage === undefined
        ? undefined
        : {
            previous: billing.waterPrevious,
            current: billing.waterCurrent,
            usage: billing.waterUsage,
            unitPrice: billing.waterUnitPrice,
            amount: billing.waterAmount,
          },
    wifiFee: billing.wifiFee,
    trashFee: billing.trashFee,
    sharedServiceTotal: billing.sharedServiceTotal,
    totalInvoiceAmount: billing.totalInvoiceAmount,
    finalizedAt: billing.finalizedAt,
    cancelledAt: billing.cancelledAt,
    cancelReason: billing.cancelReason,
    createdAt: billing.createdAt,
    updatedAt: billing.updatedAt,
  };
};
