export const BILLING_PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
export const BUSINESS_TIME_ZONE = "Asia/Ho_Chi_Minh";
export function currentBillingPeriod(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  return `${parts.find((x) => x.type === "year")!.value}-${parts.find((x) => x.type === "month")!.value}`;
}
export function nextBillingPeriod(period: string) {
  if (!BILLING_PERIOD_PATTERN.test(period))
    throw new Error("INVALID_BILLING_PERIOD");
  const [year, month] = period.split("-").map(Number) as [number, number];
  return month === 12
    ? `${year + 1}-01`
    : `${year}-${String(month + 1).padStart(2, "0")}`;
}
export function calculateReading(
  previous: number,
  current: number,
  unitPrice: number,
) {
  if (previous < 0 || current < previous || unitPrice < 0)
    throw new Error("INVALID_METER_READING");
  const usage = current - previous;
  return {
    previous,
    current,
    usage,
    unitPrice,
    amount: Math.round(usage * unitPrice),
  };
}
export function isMeterAffectingUpdate(input: Record<string, unknown>) {
  return [
    "electricityPrevious",
    "electricityCurrent",
    "waterPrevious",
    "waterCurrent",
  ].some((key) => input[key] !== undefined);
}

export type UtilityEditRestriction = "HAS_NEXT_PERIOD" | "USED_BY_INVOICE";

export function getMeterEditRestriction(input: {
  hasNextPeriod: boolean;
  usedByInvoice?: boolean;
}): UtilityEditRestriction | null {
  if (input.usedByInvoice) return "USED_BY_INVOICE";
  if (input.hasNextPeriod) return "HAS_NEXT_PERIOD";
  return null;
}

export function getUnitPriceEditRestriction(input: {
  usedByInvoice?: boolean;
}): UtilityEditRestriction | null {
  return input.usedByInvoice ? "USED_BY_INVOICE" : null;
}
