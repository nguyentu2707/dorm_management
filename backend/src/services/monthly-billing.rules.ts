import type { ContractStatus } from "../models/contract.model.js";
import {
  BILLING_PERIOD_PATTERN,
  BUSINESS_TIME_ZONE,
} from "./utility-reading.rules.js";

const DAY_MS = 86_400_000;

export type ResidencePeriod = {
  startDate: Date;
  endDate: Date;
  endedAt?: Date | null;
  nextSegmentStartDate?: Date | null;
  status: ContractStatus;
};

function calendarOrdinal(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return Date.UTC(value("year"), value("month") - 1, value("day")) / DAY_MS;
}

export function billingMonthInfo(billingPeriod: string) {
  if (!BILLING_PERIOD_PATTERN.test(billingPeriod)) {
    throw new Error("INVALID_BILLING_PERIOD");
  }
  const [year, month] = billingPeriod.split("-").map(Number) as [
    number,
    number,
  ];
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    year,
    month,
    daysInMonth,
    startOrdinal: Date.UTC(year, month - 1, 1) / DAY_MS,
    endOrdinal: Date.UTC(year, month - 1, daysInMonth) / DAY_MS,
  };
}

export function getResidenceOverlapDays(
  contract: ResidencePeriod,
  billingPeriod: string,
) {
  if (
    contract.status !== "ACTIVE" &&
    contract.status !== "ENDED" &&
    !(contract.status === "CANCELLED" && contract.endedAt)
  ) {
    return 0;
  }
  const month = billingMonthInfo(billingPeriod);
  const effectiveEnd = contract.endedAt ?? contract.endDate;
  const start = Math.max(
    calendarOrdinal(contract.startDate),
    month.startOrdinal,
  );
  let endOrdinal = calendarOrdinal(effectiveEnd);
  if (
    contract.endedAt &&
    contract.nextSegmentStartDate &&
    calendarOrdinal(contract.nextSegmentStartDate) <= endOrdinal
  ) {
    // The room-change day belongs to the new segment, so it is never billed twice.
    endOrdinal = calendarOrdinal(contract.nextSegmentStartDate) - 1;
  }
  const end = Math.min(endOrdinal, month.endOrdinal);
  return end < start ? 0 : end - start + 1;
}

export function prorateRoomFee(
  monthlyPrice: number,
  overlapDays: number,
  daysInMonth: number,
) {
  if (monthlyPrice < 0 || overlapDays < 0 || daysInMonth <= 0) {
    throw new Error("INVALID_ROOM_FEE");
  }
  return Math.round((monthlyPrice * overlapDays) / daysInMonth);
}

export function allocateExact(
  amount: number,
  recipients: Array<{ key: string; weight: number }>,
) {
  if (!Number.isInteger(amount) || amount < 0)
    throw new Error("INVALID_AMOUNT");
  const totalWeight = recipients.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight <= 0) throw new Error("NO_RECIPIENT_WEIGHT");

  const rows = recipients.map((item) => {
    const exact = (amount * item.weight) / totalWeight;
    const floor = Math.floor(exact);
    return { ...item, amount: floor, remainder: exact - floor };
  });
  let remaining = amount - rows.reduce((sum, item) => sum + item.amount, 0);
  const ranked = [...rows].sort(
    (a, b) => b.remainder - a.remainder || a.key.localeCompare(b.key),
  );
  for (let index = 0; index < remaining; index += 1) ranked[index]!.amount += 1;
  return new Map(rows.map((item) => [item.key, item.amount]));
}
