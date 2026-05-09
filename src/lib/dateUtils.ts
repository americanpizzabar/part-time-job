import { format, parseISO, addDays, isWithinInterval, getDay } from "date-fns";

export function toDateStr(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function fromDateStr(str: string): Date {
  return parseISO(str);
}

export function today(): string {
  return toDateStr(new Date());
}

export function getDateRange(start: string, days: number): string[] {
  const result: string[] = [];
  const startDate = fromDateStr(start);
  for (let i = 0; i < days; i++) {
    result.push(toDateStr(addDays(startDate, i)));
  }
  return result;
}

export interface ChoreScheduleData {
  scheduleType: string;
  daysOfWeek?: string | null;
  specificDates?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive?: boolean;
}

export function isChoreScheduledForDate(
  schedule: ChoreScheduleData,
  dateStr: string
): boolean {
  if (schedule.isActive === false) return false;

  const date = fromDateStr(dateStr);

  if (schedule.startDate && dateStr < schedule.startDate) return false;
  if (schedule.endDate && dateStr > schedule.endDate) return false;

  switch (schedule.scheduleType) {
    case "DAILY":
      return true;
    case "WEEKLY": {
      const days: number[] = schedule.daysOfWeek
        ? JSON.parse(schedule.daysOfWeek)
        : [];
      return days.includes(getDay(date));
    }
    case "SPECIFIC": {
      const dates: string[] = schedule.specificDates
        ? JSON.parse(schedule.specificDates)
        : [];
      return dates.includes(dateStr);
    }
    default:
      return false;
  }
}

export function formatJPY(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

export const DAY_NAMES_JA = ["日", "月", "火", "水", "木", "金", "土"];
export const MONTH_NAMES_JA = [
  "1月", "2月", "3月", "4月", "5月", "6月",
  "7月", "8月", "9月", "10月", "11月", "12月",
];
