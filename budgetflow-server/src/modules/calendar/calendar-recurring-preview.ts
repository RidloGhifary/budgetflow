import type {
  CategoryType,
  RecurringTransactionFrequency,
  RecurringTransactionStatus,
  TransactionType,
  WalletType
} from "@prisma/client";

import {
  getNextRunDate,
  getNextRunDateAfter,
  normalizeScheduleDate
} from "../recurring-transactions/recurring-transaction.schedule";
import { isWithinCalendarRange, toCalendarDateKey } from "./calendar-date";

export interface CalendarRecurringPreviewRule {
  amount: number;
  category: {
    color?: string | null;
    icon?: string | null;
    id: string;
    name: string;
    type: CategoryType;
  };
  categoryId: string;
  endDate?: Date | null;
  frequency: RecurringTransactionFrequency;
  id: string;
  interval: number;
  name: string;
  nextRunDate?: Date | null;
  note?: string | null;
  startDate: Date;
  status: RecurringTransactionStatus;
  type: TransactionType;
  wallet: {
    currentBalance: number;
    id: string;
    name: string;
    type: WalletType;
  };
  walletId: string;
}

export interface CalendarRecurringPreview {
  amount: number;
  category: CalendarRecurringPreviewRule["category"];
  categoryId: string;
  frequency: RecurringTransactionFrequency;
  id: string;
  interval: number;
  name: string;
  note?: string | null;
  recurringTransactionId: string;
  scheduledDate: Date;
  status: RecurringTransactionStatus;
  type: TransactionType;
  wallet: CalendarRecurringPreviewRule["wallet"];
  walletId: string;
}

export function buildRecurringPreviewOccurrences({
  endDate,
  generatedOccurrenceKeys,
  maxOccurrences = 300,
  rules,
  startDate
}: {
  endDate: Date;
  generatedOccurrenceKeys?: Set<string>;
  maxOccurrences?: number;
  rules: CalendarRecurringPreviewRule[];
  startDate: Date;
}) {
  const previews: CalendarRecurringPreview[] = [];

  for (const rule of rules) {
    if (rule.status !== "ACTIVE" || !rule.nextRunDate) {
      continue;
    }

    const firstCandidateDate = normalizeScheduleDate(rule.nextRunDate) > normalizeScheduleDate(startDate)
      ? rule.nextRunDate
      : startDate;
    let scheduledDate = getNextRunDate(rule, firstCandidateDate);

    while (scheduledDate && isWithinCalendarRange(scheduledDate, startDate, endDate)) {
      const occurrenceKey = getRecurringOccurrenceKey(rule.id, scheduledDate);

      if (!generatedOccurrenceKeys?.has(occurrenceKey)) {
        previews.push({
          amount: rule.amount,
          category: rule.category,
          categoryId: rule.categoryId,
          frequency: rule.frequency,
          id: `${rule.id}:${toCalendarDateKey(scheduledDate)}`,
          interval: rule.interval,
          name: rule.name,
          note: rule.note ?? null,
          recurringTransactionId: rule.id,
          scheduledDate,
          status: rule.status,
          type: rule.type,
          wallet: rule.wallet,
          walletId: rule.walletId
        });
      }

      if (previews.length >= maxOccurrences) {
        return previews;
      }

      scheduledDate = getNextRunDateAfter(rule, scheduledDate);
    }
  }

  return previews.sort((first, second) => {
    const dateDifference = first.scheduledDate.getTime() - second.scheduledDate.getTime();

    if (dateDifference !== 0) {
      return dateDifference;
    }

    return first.name.localeCompare(second.name);
  });
}

export function getRecurringOccurrenceKey(recurringTransactionId: string, scheduledDate: Date) {
  return `${recurringTransactionId}:${toCalendarDateKey(scheduledDate)}`;
}
