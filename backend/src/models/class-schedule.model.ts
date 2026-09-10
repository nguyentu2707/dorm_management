export const DAYS_OF_WEEK = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];
export type ScheduleEntry = {
  dayOfWeek: DayOfWeek;
  startPeriod: number;
  endPeriod: number;
};
export interface ClassSchedule {
  studentId: string;
  entries: ScheduleEntry[];
  createdAt: Date;
  updatedAt: Date;
}
export type ClassScheduleDocument = ClassSchedule & { id: string };
