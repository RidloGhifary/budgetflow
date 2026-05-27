import { getCalendarDateKeys, getCalendarDateRange, toCalendarDateKey } from "./calendar-date";
import {
  buildRecurringPreviewOccurrences,
  getRecurringOccurrenceKey,
  type CalendarRecurringPreviewRule
} from "./calendar-recurring-preview";
import {
  findCalendarDayTransactions,
  findCalendarRecurringTransactions,
  findCalendarTransactionSummaries,
  findGeneratedRecurringOccurrenceKeys,
  type CalendarRecurringTransactionRecord,
  type CalendarTransactionSummaryRecord
} from "./calendar.repository";
import type {
  CalendarDayDetailQueryInput,
  CalendarSummaryQueryInput
} from "./calendar.validators";
import { toTransactionResponse } from "../transactions/transaction.mapper";

export async function getUserCalendarSummary(userId: string, filters: CalendarSummaryQueryInput) {
  const range = getCalendarDateRange(filters.startDate, filters.endDate);
  const transactions = await findCalendarTransactionSummaries(userId, {
    categoryId: filters.categoryId,
    endExclusive: range.endExclusive,
    startDate: range.startDate,
    type: filters.type,
    walletId: filters.walletId
  });
  const summariesByDate = buildDailySummaryMap(range.startDate, range.endDate, transactions);
  const upcomingRecurringTransactions = filters.includeRecurring
    ? await getRecurringPreviewItems(userId, filters, range.startDate, range.endDate, range.endExclusive)
    : [];

  for (const preview of upcomingRecurringTransactions) {
    const summary = summariesByDate.get(toCalendarDateKey(preview.scheduledDate));

    if (summary) {
      summary.recurringUpcomingCount += 1;
      summary.hasActivity = true;
    }
  }

  return {
    days: Array.from(summariesByDate.values()),
    endDate: toCalendarDateKey(range.endDate),
    startDate: toCalendarDateKey(range.startDate)
  };
}

export async function getUserCalendarDayDetail(userId: string, filters: CalendarDayDetailQueryInput) {
  const range = getCalendarDateRange(filters.date, filters.date);
  const [summaryTransactions, dayTransactions] = await Promise.all([
    findCalendarTransactionSummaries(userId, {
      categoryId: filters.categoryId,
      endExclusive: range.endExclusive,
      startDate: range.startDate,
      type: filters.type,
      walletId: filters.walletId
    }),
    findCalendarDayTransactions(userId, {
      categoryId: filters.categoryId,
      endExclusive: range.endExclusive,
      page: filters.page,
      pageSize: filters.pageSize,
      startDate: range.startDate,
      type: filters.type,
      walletId: filters.walletId
    })
  ]);
  const upcomingRecurringTransactions = filters.includeRecurring
    ? await getRecurringPreviewItems(userId, filters, range.startDate, range.endDate, range.endExclusive)
    : [];
  const summary = buildDailySummaryMap(range.startDate, range.endDate, summaryTransactions).get(toCalendarDateKey(range.startDate));

  if (summary) {
    summary.recurringUpcomingCount = upcomingRecurringTransactions.length;
    summary.hasActivity = summary.hasActivity || upcomingRecurringTransactions.length > 0;
  }

  return {
    date: toCalendarDateKey(range.startDate),
    pagination: dayTransactions.pagination,
    summary: summary ?? createEmptyDaySummary(toCalendarDateKey(range.startDate)),
    transactions: dayTransactions.transactions.map(toTransactionResponse),
    upcomingRecurringTransactions: upcomingRecurringTransactions.map(toRecurringPreviewResponse)
  };
}

function buildDailySummaryMap(startDate: Date, endDate: Date, transactions: CalendarTransactionSummaryRecord[]) {
  const summariesByDate = new Map(getCalendarDateKeys(startDate, endDate).map((date) => [date, createEmptyDaySummary(date)]));

  for (const transaction of transactions) {
    const dateKey = toCalendarDateKey(transaction.transactionDate);
    const summary = summariesByDate.get(dateKey);

    if (!summary) {
      continue;
    }

    const amount = Number(transaction.amount);

    summary.transactionCount += 1;
    summary.hasActivity = true;

    if (transaction.type === "INCOME") {
      summary.incomeTotal += amount;
      summary.incomeCount += 1;
    } else {
      summary.expenseTotal += amount;
      summary.expenseCount += 1;
    }

    summary.netTotal = summary.incomeTotal - summary.expenseTotal;
  }

  return summariesByDate;
}

async function getRecurringPreviewItems(
  userId: string,
  filters: Pick<CalendarSummaryQueryInput, "categoryId" | "type" | "walletId">,
  startDate: Date,
  endDate: Date,
  endExclusive: Date
) {
  const recurringTransactions = await findCalendarRecurringTransactions(userId, {
    categoryId: filters.categoryId,
    endDate,
    startDate,
    type: filters.type,
    walletId: filters.walletId
  });
  const occurrenceRows = await findGeneratedRecurringOccurrenceKeys(
    recurringTransactions.map((recurringTransaction) => recurringTransaction.id),
    startDate,
    endExclusive
  );
  const generatedOccurrenceKeys = new Set(
    occurrenceRows.map((occurrence) => getRecurringOccurrenceKey(occurrence.recurringTransactionId, occurrence.scheduledForDate))
  );

  return buildRecurringPreviewOccurrences({
    endDate,
    generatedOccurrenceKeys,
    rules: recurringTransactions.map(toRecurringPreviewRule),
    startDate
  });
}

function createEmptyDaySummary(date: string) {
  return {
    date,
    expenseCount: 0,
    expenseTotal: 0,
    hasActivity: false,
    incomeCount: 0,
    incomeTotal: 0,
    netTotal: 0,
    recurringUpcomingCount: 0,
    transactionCount: 0
  };
}

function toRecurringPreviewRule(recurringTransaction: CalendarRecurringTransactionRecord): CalendarRecurringPreviewRule {
  return {
    amount: Number(recurringTransaction.amount),
    category: recurringTransaction.category,
    categoryId: recurringTransaction.categoryId,
    endDate: recurringTransaction.endDate,
    frequency: recurringTransaction.frequency,
    id: recurringTransaction.id,
    interval: recurringTransaction.interval,
    name: recurringTransaction.name,
    nextRunDate: recurringTransaction.nextRunDate,
    note: recurringTransaction.note,
    startDate: recurringTransaction.startDate,
    status: recurringTransaction.status,
    type: recurringTransaction.type,
    wallet: {
      ...recurringTransaction.wallet,
      currentBalance: Number(recurringTransaction.wallet.currentBalance)
    },
    walletId: recurringTransaction.walletId
  };
}

function toRecurringPreviewResponse(preview: ReturnType<typeof buildRecurringPreviewOccurrences>[number]) {
  return {
    amount: preview.amount,
    category: preview.category,
    categoryId: preview.categoryId,
    frequency: preview.frequency,
    id: preview.id,
    interval: preview.interval,
    name: preview.name,
    note: preview.note,
    recurringTransactionId: preview.recurringTransactionId,
    scheduledDate: preview.scheduledDate,
    status: preview.status,
    type: preview.type,
    wallet: preview.wallet,
    walletId: preview.walletId
  };
}
