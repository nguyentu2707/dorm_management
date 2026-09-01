export function addCalendarMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDay = new Date(
    result.getFullYear(),
    result.getMonth() + 1,
    0,
  ).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
}
export function createDefaultContractPeriod(now = new Date()) {
  const startDate = new Date(now);
  return { startDate, endDate: addCalendarMonths(startDate, 6) };
}
