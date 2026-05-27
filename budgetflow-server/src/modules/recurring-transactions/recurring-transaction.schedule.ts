import type { RecurringTransactionFrequency } from "@prisma/client";

export interface ScheduleInput {
  endDate?: Date | null;
  frequency: RecurringTransactionFrequency;
  interval: number;
  startDate: Date;
}

const dayMs = 24 * 60 * 60 * 1000;

export function normalizeScheduleDate(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

export function getNextRunDate(input: ScheduleInput, fromDate = new Date()) {
  const interval = Math.max(1, Math.floor(input.interval));
  const startDate = normalizeScheduleDate(input.startDate);
  const endDate = input.endDate ? normalizeScheduleDate(input.endDate) : null;
  const from = normalizeScheduleDate(fromDate);
  const candidate = getCandidateOnOrAfter({
    frequency: input.frequency,
    fromDate: from,
    interval,
    startDate
  });

  if (endDate && candidate > endDate) {
    return null;
  }

  return candidate;
}

export function getNextRunDateAfter(input: ScheduleInput, scheduledForDate: Date) {
  return getNextRunDate(input, addDays(normalizeScheduleDate(scheduledForDate), 1));
}

function getCandidateOnOrAfter({
  frequency,
  fromDate,
  interval,
  startDate
}: {
  frequency: RecurringTransactionFrequency;
  fromDate: Date;
  interval: number;
  startDate: Date;
}) {
  if (fromDate <= startDate) {
    return startDate;
  }

  if (frequency === "DAILY") {
    const daysSinceStart = daysBetween(startDate, fromDate);
    const offset = Math.ceil(daysSinceStart / interval) * interval;
    return addDays(startDate, offset);
  }

  if (frequency === "WEEKLY") {
    const weeksSinceStart = daysBetween(startDate, fromDate) / 7;
    const offset = Math.ceil(weeksSinceStart / interval) * interval;
    return addDays(startDate, offset * 7);
  }

  if (frequency === "MONTHLY") {
    return getMonthlyCandidate(startDate, fromDate, interval);
  }

  return getYearlyCandidate(startDate, fromDate, interval);
}

function getMonthlyCandidate(startDate: Date, fromDate: Date, interval: number) {
  const monthsSinceStart = monthDistance(startDate, fromDate);
  let offset = Math.max(0, Math.ceil(monthsSinceStart / interval) * interval);
  let candidate = addMonthsClamped(startDate, offset);

  if (candidate < fromDate) {
    offset += interval;
    candidate = addMonthsClamped(startDate, offset);
  }

  return candidate;
}

function getYearlyCandidate(startDate: Date, fromDate: Date, interval: number) {
  const yearsSinceStart = fromDate.getUTCFullYear() - startDate.getUTCFullYear();
  let offset = Math.max(0, Math.ceil(yearsSinceStart / interval) * interval);
  let candidate = addYearsClamped(startDate, offset);

  if (candidate < fromDate) {
    offset += interval;
    candidate = addYearsClamped(startDate, offset);
  }

  return candidate;
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * dayMs);
}

function daysBetween(startDate: Date, endDate: Date) {
  return Math.floor((endDate.getTime() - startDate.getTime()) / dayMs);
}

function monthDistance(startDate: Date, endDate: Date) {
  return (
    (endDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12 +
    (endDate.getUTCMonth() - startDate.getUTCMonth())
  );
}

function addMonthsClamped(startDate: Date, monthsToAdd: number) {
  const year = startDate.getUTCFullYear();
  const month = startDate.getUTCMonth() + monthsToAdd;
  const targetYear = year + Math.floor(month / 12);
  const targetMonth = ((month % 12) + 12) % 12;
  const day = Math.min(startDate.getUTCDate(), daysInMonth(targetYear, targetMonth));

  return new Date(Date.UTC(targetYear, targetMonth, day));
}

function addYearsClamped(startDate: Date, yearsToAdd: number) {
  const targetYear = startDate.getUTCFullYear() + yearsToAdd;
  const targetMonth = startDate.getUTCMonth();
  const day = Math.min(startDate.getUTCDate(), daysInMonth(targetYear, targetMonth));

  return new Date(Date.UTC(targetYear, targetMonth, day));
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}
