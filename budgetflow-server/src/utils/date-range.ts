export interface MonthYear {
  month: number;
  year: number;
}

export interface MonthRange extends MonthYear {
  startDate: Date;
  endDate: Date;
}

export function getCurrentMonthYear(date = new Date()): MonthYear {
  return {
    month: date.getMonth() + 1,
    year: date.getFullYear()
  };
}

export function resolveMonthYear(input: Partial<MonthYear>): MonthYear {
  const current = getCurrentMonthYear();

  return {
    month: input.month ?? current.month,
    year: input.year ?? current.year
  };
}

export function getMonthRange(month: number, year: number): MonthRange {
  return {
    month,
    year,
    startDate: new Date(Date.UTC(year, month - 1, 1)),
    endDate: new Date(Date.UTC(year, month, 1))
  };
}

export function getLastMonthRanges(month: number, year: number, count: number): MonthRange[] {
  return Array.from({ length: count }, (_, index) => {
    const offset = count - 1 - index;
    const monthIndex = month - 1 - offset;
    const date = new Date(Date.UTC(year, monthIndex, 1));

    return getMonthRange(date.getUTCMonth() + 1, date.getUTCFullYear());
  });
}

export function getMonthLabel(month: number, year: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}
