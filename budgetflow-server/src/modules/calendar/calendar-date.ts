const dayMs = 24 * 60 * 60 * 1000;

export interface CalendarDateRange {
  endDate: Date;
  endExclusive: Date;
  startDate: Date;
  totalDays: number;
}

export function normalizeCalendarDate(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

export function addCalendarDays(value: Date, days: number) {
  return new Date(normalizeCalendarDate(value).getTime() + days * dayMs);
}

export function toCalendarDateKey(value: Date) {
  return normalizeCalendarDate(value).toISOString().slice(0, 10);
}

export function getCalendarDateRange(startDate: Date, endDate: Date): CalendarDateRange {
  const start = normalizeCalendarDate(startDate);
  const end = normalizeCalendarDate(endDate);

  return {
    endDate: end,
    endExclusive: addCalendarDays(end, 1),
    startDate: start,
    totalDays: daysBetween(start, end) + 1
  };
}

export function getCalendarDateKeys(startDate: Date, endDate: Date) {
  const range = getCalendarDateRange(startDate, endDate);

  return Array.from({ length: range.totalDays }, (_, index) => toCalendarDateKey(addCalendarDays(range.startDate, index)));
}

export function isWithinCalendarRange(value: Date, startDate: Date, endDate: Date) {
  const date = normalizeCalendarDate(value);
  const start = normalizeCalendarDate(startDate);
  const end = normalizeCalendarDate(endDate);

  return date >= start && date <= end;
}

function daysBetween(startDate: Date, endDate: Date) {
  return Math.floor((normalizeCalendarDate(endDate).getTime() - normalizeCalendarDate(startDate).getTime()) / dayMs);
}
