import { getCurrentMonthYear, getMonthRange } from "../../utils/date-range";
import {
  getNextRunDate,
  getNextRunDateAfter,
  normalizeScheduleDate
} from "../recurring-transactions/recurring-transaction.schedule";
import { calculateFinancialHealthScore } from "./financial-health.calculator";
import { generateFinancialHealthInsights } from "./financial-health.insights";
import {
  findActiveRecurringExpenseRules,
  findBudgetsForMonths,
  getBudgetMonthKey,
  getNormalExpenseTotalsByBudgetMonth,
  getTransactionTotalsForRange,
  type BudgetMonth,
  type FinancialHealthPeriodRange,
  type FinancialHealthRecurringRecord
} from "./financial-health.repository";
import type { FinancialHealthAggregates, FinancialHealthBudgetMetric } from "./financial-health.types";
import type { FinancialHealthQueryInput } from "./financial-health.validators";

const dayMs = 24 * 60 * 60 * 1000;
const maxRecurringOccurrencesPerRule = 500;

export async function getUserFinancialHealth(userId: string, input: FinancialHealthQueryInput) {
  const period = resolveRequestedPeriod(input.startDate, input.endDate);
  const comparisonPeriod = resolveComparisonPeriod(input, period);
  const aggregates = await getFinancialHealthAggregates(userId, period, comparisonPeriod);
  const scoreResult = calculateFinancialHealthScore(aggregates);
  const insights = generateFinancialHealthInsights(aggregates);

  return {
    comparisonPeriod: toPeriodResponse(comparisonPeriod),
    components: scoreResult.components,
    insights,
    metadata: {
      calculatedAt: new Date(),
      hasEnoughData: scoreResult.components.some((component) => component.available),
      missingMetrics: scoreResult.missingMetrics
    },
    period: toPeriodResponse(period),
    score: scoreResult.score,
    status: scoreResult.status,
    summary: scoreResult.summary
  };
}

async function getFinancialHealthAggregates(
  userId: string,
  period: FinancialHealthPeriodRange,
  comparisonPeriod: FinancialHealthPeriodRange
): Promise<FinancialHealthAggregates> {
  const [currentTotals, previousTotals, budgetMetrics, recurringSummary] = await Promise.all([
    getTransactionTotalsForRange(userId, period),
    getTransactionTotalsForRange(userId, comparisonPeriod),
    getBudgetMetrics(userId, period),
    getRecurringExpenseSummary(userId, period)
  ]);

  return {
    budgetMetrics,
    hasRecurringData: recurringSummary.hasRecurringData,
    netCashflow: currentTotals.totalIncome - currentTotals.totalExpense,
    previousExpenseTotal: previousTotals.totalExpense > 0 ? previousTotals.totalExpense : null,
    recurringExpenseCount: recurringSummary.occurrenceCount,
    recurringExpenseTotal: recurringSummary.hasRecurringData ? recurringSummary.totalAmount : null,
    totalExpense: currentTotals.totalExpense,
    totalIncome: currentTotals.totalIncome
  };
}

async function getBudgetMetrics(userId: string, period: FinancialHealthPeriodRange): Promise<FinancialHealthBudgetMetric[]> {
  const months = getMonthsInRange(period.startDate, addDays(period.endExclusive, -1));
  const budgets = await findBudgetsForMonths(userId, months);

  if (budgets.length === 0) {
    return [];
  }

  const rangeByMonthKey = getRangeByBudgetMonth(period, months);
  const usedAmountByBudgetMonth = await getNormalExpenseTotalsByBudgetMonth(userId, budgets, rangeByMonthKey);

  return budgets.map((budget) => {
    const usedAmount = usedAmountByBudgetMonth.get(`${getBudgetMonthKey(budget)}:${budget.categoryId}`) ?? 0;
    const limitAmount = Number(budget.limitAmount);

    return {
      budgetId: budget.id,
      categoryId: budget.categoryId,
      categoryName: budget.category.name,
      limitAmount,
      usagePercentage: limitAmount > 0 ? (usedAmount / limitAmount) * 100 : 0,
      usedAmount
    };
  });
}

async function getRecurringExpenseSummary(userId: string, period: FinancialHealthPeriodRange) {
  const rules = await findActiveRecurringExpenseRules(userId);
  let occurrenceCount = 0;
  let totalAmount = 0;

  for (const rule of rules) {
    const occurrences = countRecurringOccurrencesInPeriod(rule, period);

    occurrenceCount += occurrences;
    totalAmount += occurrences * Number(rule.amount);
  }

  return {
    hasRecurringData: rules.length > 0,
    occurrenceCount,
    totalAmount
  };
}

function countRecurringOccurrencesInPeriod(rule: FinancialHealthRecurringRecord, period: FinancialHealthPeriodRange) {
  const periodEnd = addDays(period.endExclusive, -1);
  let occurrence = getNextRunDate(
    {
      endDate: rule.endDate,
      frequency: rule.frequency,
      interval: rule.interval,
      startDate: rule.startDate
    },
    period.startDate
  );
  let count = 0;

  while (occurrence && occurrence <= periodEnd && count < maxRecurringOccurrencesPerRule) {
    count += 1;
    occurrence = getNextRunDateAfter(
      {
        endDate: rule.endDate,
        frequency: rule.frequency,
        interval: rule.interval,
        startDate: rule.startDate
      },
      occurrence
    );
  }

  return count;
}

function resolveRequestedPeriod(startDate?: Date, endDate?: Date): FinancialHealthPeriodRange {
  if (startDate && endDate) {
    return getInclusivePeriodRange(startDate, endDate);
  }

  const currentMonthYear = getCurrentMonthYear();
  const monthRange = getMonthRange(currentMonthYear.month, currentMonthYear.year);

  return {
    endExclusive: monthRange.endDate,
    startDate: monthRange.startDate
  };
}

function resolveComparisonPeriod(
  input: Pick<FinancialHealthQueryInput, "compareEndDate" | "compareStartDate">,
  period: FinancialHealthPeriodRange
): FinancialHealthPeriodRange {
  if (input.compareStartDate && input.compareEndDate) {
    return getInclusivePeriodRange(input.compareStartDate, input.compareEndDate);
  }

  const previousMonthDate = new Date(Date.UTC(period.startDate.getUTCFullYear(), period.startDate.getUTCMonth() - 1, 1));
  const monthRange = getMonthRange(previousMonthDate.getUTCMonth() + 1, previousMonthDate.getUTCFullYear());

  return {
    endExclusive: monthRange.endDate,
    startDate: monthRange.startDate
  };
}

function getInclusivePeriodRange(startDate: Date, endDate: Date): FinancialHealthPeriodRange {
  const start = normalizeScheduleDate(startDate);
  const end = normalizeScheduleDate(endDate);

  return {
    endExclusive: addDays(end, 1),
    startDate: start
  };
}

function getMonthsInRange(startDate: Date, endDate: Date): BudgetMonth[] {
  const months: BudgetMonth[] = [];
  let cursor = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));
  const endMonth = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), 1));

  while (cursor <= endMonth) {
    months.push({
      month: cursor.getUTCMonth() + 1,
      year: cursor.getUTCFullYear()
    });
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
  }

  return months;
}

function getRangeByBudgetMonth(period: FinancialHealthPeriodRange, months: BudgetMonth[]) {
  const periodEndInclusive = addDays(period.endExclusive, -1);

  return new Map(
    months.map((month) => {
      const monthRange = getMonthRange(month.month, month.year);
      const monthEndInclusive = addDays(monthRange.endDate, -1);
      const startDate = maxDate(period.startDate, monthRange.startDate);
      const endInclusive = minDate(periodEndInclusive, monthEndInclusive);

      return [
        getBudgetMonthKey(month),
        {
          endExclusive: addDays(endInclusive, 1),
          startDate
        }
      ];
    })
  );
}

function toPeriodResponse(period: FinancialHealthPeriodRange) {
  return {
    endDate: toDateKey(addDays(period.endExclusive, -1)),
    startDate: toDateKey(period.startDate)
  };
}

function toDateKey(date: Date) {
  return normalizeScheduleDate(date).toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  return new Date(normalizeScheduleDate(date).getTime() + days * dayMs);
}

function maxDate(first: Date, second: Date) {
  return first > second ? first : second;
}

function minDate(first: Date, second: Date) {
  return first < second ? first : second;
}
