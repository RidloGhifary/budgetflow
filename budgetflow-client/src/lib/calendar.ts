export interface CalendarGridDay {
  date: Date;
  dateKey: string;
  isCurrentMonth: boolean;
  isToday: boolean;
}

const dayMs = 24 * 60 * 60 * 1000;
const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function getCalendarGridDays(month: number, year: number): CalendarGridDay[] {
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const gridStart = addDays(monthStart, -monthStart.getUTCDay());
  const monthEnd = new Date(Date.UTC(year, month, 0));
  const gridEnd = addDays(monthEnd, 6 - monthEnd.getUTCDay());
  const totalDays = Math.round((gridEnd.getTime() - gridStart.getTime()) / dayMs) + 1;
  const todayKey = toDateKey(new Date());

  return Array.from({ length: totalDays }, (_, index) => {
    const date = addDays(gridStart, index);

    return {
      date,
      dateKey: toDateKey(date),
      isCurrentMonth: date.getUTCMonth() === month - 1,
      isToday: toDateKey(date) === todayKey
    };
  });
}

export function getCalendarRangeForMonthGrid(month: number, year: number) {
  const days = getCalendarGridDays(month, year);

  return {
    endDate: days[days.length - 1].dateKey,
    startDate: days[0].dateKey
  };
}

export function toDateKey(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;

  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).toISOString().slice(0, 10);
}

export function getCurrentMonthYear() {
  const date = new Date();

  return {
    month: date.getMonth() + 1,
    year: date.getFullYear()
  };
}

export function shiftMonth(month: number, year: number, offset: number) {
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));

  return {
    month: date.getUTCMonth() + 1,
    year: date.getUTCFullYear()
  };
}

export function getMonthTitle(month: number, year: number) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    timeZone: "UTC",
    year: "numeric"
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function getLongDateLabel(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    weekday: "long",
    year: "numeric"
  }).format(new Date(`${value}T00:00:00.000Z`));
}

export function getWeekdayLabels() {
  return weekdayLabels;
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * dayMs);
}
