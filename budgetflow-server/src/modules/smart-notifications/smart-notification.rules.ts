import type {
  NotificationCategory,
  NotificationSeverity,
  RecurringTransactionStatus,
  TransactionPurpose,
  TransactionType
} from "@prisma/client";

import type { FinancialHealthStatus } from "../financial-health/financial-health.types";
import { NOTIFICATION_ENTITY_TYPES, NOTIFICATION_TYPES } from "../notifications/notification.constants";

export interface SmartNotificationCandidate {
  actionUrl?: string | null;
  category: NotificationCategory;
  dedupeKey: string;
  entityId?: string | null;
  entityType?: string | null;
  message: string;
  metadata?: Record<string, number | string | boolean | null>;
  ruleKey: string;
  severity: NotificationSeverity;
  title: string;
  type: string;
  userId: string;
}

export interface BudgetRuleInput {
  budgetId: string;
  categoryId: string;
  categoryName: string;
  limitAmount: number;
  month: number;
  usagePercentage: number;
  usedAmount: number;
  userId: string;
  year: number;
}

export interface LargeExpenseRuleInput {
  historicalAverageAmount: number | null;
  historicalExpenseCount: number;
  transaction: {
    amount: number;
    categoryId: string;
    categoryName: string;
    id: string;
    purpose: TransactionPurpose;
    type: TransactionType;
  };
  userId: string;
}

export interface PeriodFinancialRuleInput {
  currentExpenseTotal: number;
  currentIncomeTotal: number;
  periodKey: string;
  previousExpenseTotal: number | null;
  userId: string;
}

export interface FinancialHealthStatusChangeRuleInput {
  currentPeriodKey: string;
  currentStatus: FinancialHealthStatus;
  previousPeriodKey: string;
  previousStatus: FinancialHealthStatus | null;
  userId: string;
}

export interface RecurringReminderRuleInput {
  recurringTransaction: {
    id: string;
    name: string;
    nextRunDate?: Date | null;
    status: RecurringTransactionStatus;
    type: TransactionType;
  };
  today: Date;
  userId: string;
}

export interface DataImportResultRuleInput {
  failedRows?: number;
  importId: string;
  importedRows?: number;
  result: "completed" | "completed_with_errors" | "failed";
  safeErrorMessage?: string;
  userId: string;
}

export interface DataExportResultRuleInput {
  exportId: string;
  result: "completed" | "failed";
  rowCount?: number | null;
  safeErrorMessage?: string;
  userId: string;
}

const recurringReminderWindows = new Set([3, 1, 0]);
const statusRank: Record<FinancialHealthStatus, number> = {
  critical: 0,
  not_enough_data: 0,
  needs_attention: 1,
  fair: 2,
  good: 3,
  excellent: 4
};
const statusLabel: Record<FinancialHealthStatus, string> = {
  critical: "Critical",
  excellent: "Excellent",
  fair: "Fair",
  good: "Good",
  needs_attention: "Needs Attention",
  not_enough_data: "Not enough data"
};

export function getBudgetRuleCandidates(input: BudgetRuleInput): SmartNotificationCandidate[] {
  const candidates: SmartNotificationCandidate[] = [];
  const periodKey = getMonthPeriodKey(input.month, input.year);
  const roundedUsage = Math.round(input.usagePercentage);

  if (input.usagePercentage >= 80 && input.usagePercentage <= 100) {
    candidates.push({
      actionUrl: "/budgets",
      category: "BUDGET",
      dedupeKey: smartDedupeKey(input.userId, "budget_near_limit", input.budgetId, periodKey, "80"),
      entityId: input.budgetId,
      entityType: NOTIFICATION_ENTITY_TYPES.BUDGET,
      message: `${input.categoryName} budget has reached ${roundedUsage}% for ${periodKey}.`,
      metadata: getBudgetMetadata(input, "80"),
      ruleKey: "budget_near_limit",
      severity: "WARNING",
      title: `${input.categoryName} budget is close to the limit`,
      type: NOTIFICATION_TYPES.BUDGET_THRESHOLD_80,
      userId: input.userId
    });
  }

  if (input.usagePercentage > 100) {
    candidates.push({
      actionUrl: "/budgets",
      category: "BUDGET",
      dedupeKey: smartDedupeKey(input.userId, "budget_exceeded", input.budgetId, periodKey, "100"),
      entityId: input.budgetId,
      entityType: NOTIFICATION_ENTITY_TYPES.BUDGET,
      message: `${input.categoryName} budget has reached ${roundedUsage}% for ${periodKey}.`,
      metadata: getBudgetMetadata(input, "100"),
      ruleKey: "budget_exceeded",
      severity: "CRITICAL",
      title: `${input.categoryName} budget has been exceeded`,
      type: NOTIFICATION_TYPES.BUDGET_EXCEEDED,
      userId: input.userId
    });
  }

  if (input.usagePercentage > 120) {
    candidates.push({
      actionUrl: "/budgets",
      category: "BUDGET",
      dedupeKey: smartDedupeKey(input.userId, "budget_critically_exceeded", input.budgetId, periodKey, "120"),
      entityId: input.budgetId,
      entityType: NOTIFICATION_ENTITY_TYPES.BUDGET,
      message: `${input.categoryName} budget has reached ${roundedUsage}% for ${periodKey}.`,
      metadata: getBudgetMetadata(input, "120"),
      ruleKey: "budget_critically_exceeded",
      severity: "CRITICAL",
      title: `${input.categoryName} budget is critically over limit`,
      type: NOTIFICATION_TYPES.BUDGET_CRITICALLY_EXCEEDED,
      userId: input.userId
    });
  }

  return uniqueCandidates(candidates);
}

export function getLargeExpenseRuleCandidates(input: LargeExpenseRuleInput): SmartNotificationCandidate[] {
  const { transaction } = input;

  if (transaction.type !== "EXPENSE" || transaction.purpose !== "NORMAL") {
    return [];
  }

  if (!input.historicalAverageAmount || input.historicalExpenseCount < 3) {
    return [];
  }

  if (transaction.amount < input.historicalAverageAmount * 2) {
    return [];
  }

  return [
    {
      actionUrl: "/transactions",
      category: "TRANSACTION",
      dedupeKey: smartDedupeKey(input.userId, "large_expense", transaction.id),
      entityId: transaction.id,
      entityType: NOTIFICATION_ENTITY_TYPES.TRANSACTION,
      message: `${transaction.categoryName} expense is higher than your recent category average.`,
      metadata: {
        amount: transaction.amount,
        averageAmount: input.historicalAverageAmount,
        categoryId: transaction.categoryId,
        categoryName: transaction.categoryName,
        historicalExpenseCount: input.historicalExpenseCount
      },
      ruleKey: "large_expense",
      severity: "WARNING",
      title: "Large expense recorded",
      type: NOTIFICATION_TYPES.TRANSACTION_LARGE_EXPENSE,
      userId: input.userId
    }
  ];
}

export function getPeriodFinancialRuleCandidates(input: PeriodFinancialRuleInput): SmartNotificationCandidate[] {
  return uniqueCandidates([
    ...getSpendingTrendCandidates(input),
    ...getNegativeCashflowCandidates(input),
    ...getLowSavingsRateCandidates(input)
  ]);
}

export function getSpendingTrendCandidates(input: PeriodFinancialRuleInput): SmartNotificationCandidate[] {
  if (!input.previousExpenseTotal || input.previousExpenseTotal <= 0) {
    return [];
  }

  const increaseRate = (input.currentExpenseTotal - input.previousExpenseTotal) / input.previousExpenseTotal;

  if (increaseRate <= 0.25) {
    return [];
  }

  return [
    {
      actionUrl: "/dashboard",
      category: "FINANCE",
      dedupeKey: smartDedupeKey(input.userId, "spending_increased", input.periodKey),
      entityId: input.periodKey,
      entityType: NOTIFICATION_ENTITY_TYPES.FINANCIAL_HEALTH,
      message: `Expenses increased by ${Math.round(increaseRate * 100)}% compared with the previous period.`,
      metadata: {
        currentExpenseTotal: input.currentExpenseTotal,
        increasePercentage: increaseRate * 100,
        periodKey: input.periodKey,
        previousExpenseTotal: input.previousExpenseTotal
      },
      ruleKey: "spending_increased",
      severity: "WARNING",
      title: "Spending increased significantly",
      type: NOTIFICATION_TYPES.FINANCIAL_HEALTH_SPENDING_INCREASED,
      userId: input.userId
    }
  ];
}

export function getNegativeCashflowCandidates(input: PeriodFinancialRuleInput): SmartNotificationCandidate[] {
  if (input.currentExpenseTotal <= 0 && input.currentIncomeTotal <= 0) {
    return [];
  }

  if (input.currentExpenseTotal <= input.currentIncomeTotal) {
    return [];
  }

  return [
    {
      actionUrl: "/dashboard",
      category: "FINANCE",
      dedupeKey: smartDedupeKey(input.userId, "negative_cashflow", input.periodKey),
      entityId: input.periodKey,
      entityType: NOTIFICATION_ENTITY_TYPES.FINANCIAL_HEALTH,
      message: "You spent more than you earned this period.",
      metadata: {
        expenseTotal: input.currentExpenseTotal,
        incomeTotal: input.currentIncomeTotal,
        netCashflow: input.currentIncomeTotal - input.currentExpenseTotal,
        periodKey: input.periodKey
      },
      ruleKey: "negative_cashflow",
      severity: "CRITICAL",
      title: "Expenses are higher than income",
      type: NOTIFICATION_TYPES.FINANCIAL_HEALTH_NEGATIVE_CASHFLOW,
      userId: input.userId
    }
  ];
}

export function getLowSavingsRateCandidates(input: PeriodFinancialRuleInput): SmartNotificationCandidate[] {
  if (input.currentIncomeTotal <= 0) {
    return [];
  }

  const savingsRate = (input.currentIncomeTotal - input.currentExpenseTotal) / input.currentIncomeTotal;

  if (savingsRate < 0 || savingsRate >= 0.1) {
    return [];
  }

  return [
    {
      actionUrl: "/dashboard",
      category: "FINANCE",
      dedupeKey: smartDedupeKey(input.userId, "low_savings_rate", input.periodKey),
      entityId: input.periodKey,
      entityType: NOTIFICATION_ENTITY_TYPES.FINANCIAL_HEALTH,
      message: `Your savings rate is ${Math.round(savingsRate * 100)}% this period.`,
      metadata: {
        incomeTotal: input.currentIncomeTotal,
        periodKey: input.periodKey,
        savingsRatePercentage: savingsRate * 100
      },
      ruleKey: "low_savings_rate",
      severity: "WARNING",
      title: "Savings rate is low",
      type: NOTIFICATION_TYPES.FINANCIAL_HEALTH_LOW_SAVINGS_RATE,
      userId: input.userId
    }
  ];
}

export function getFinancialHealthStatusChangeCandidates(
  input: FinancialHealthStatusChangeRuleInput
): SmartNotificationCandidate[] {
  if (!input.previousStatus || input.currentStatus === "not_enough_data" || input.previousStatus === "not_enough_data") {
    return [];
  }

  const currentRank = statusRank[input.currentStatus];
  const previousRank = statusRank[input.previousStatus];
  const rankChange = currentRank - previousRank;

  if (rankChange === 0) {
    return [];
  }

  if (rankChange < 0) {
    const drop = Math.abs(rankChange);

    return [
      {
        actionUrl: "/dashboard",
        category: "FINANCE",
        dedupeKey: smartDedupeKey(
          input.userId,
          "financial_health_score_dropped",
          input.previousPeriodKey,
          input.currentPeriodKey
        ),
        entityId: input.currentPeriodKey,
        entityType: NOTIFICATION_ENTITY_TYPES.FINANCIAL_HEALTH,
        message: `Financial health changed from ${statusLabel[input.previousStatus]} to ${statusLabel[input.currentStatus]}.`,
        metadata: {
          currentPeriodKey: input.currentPeriodKey,
          currentStatus: input.currentStatus,
          previousPeriodKey: input.previousPeriodKey,
          previousStatus: input.previousStatus,
          statusLevelChange: rankChange
        },
        ruleKey: "financial_health_score_dropped",
        severity: drop >= 2 ? "CRITICAL" : "WARNING",
        title: "Financial health score dropped",
        type: NOTIFICATION_TYPES.FINANCIAL_HEALTH_SCORE_DROPPED,
        userId: input.userId
      }
    ];
  }

  return [
    {
      actionUrl: "/dashboard",
      category: "FINANCE",
      dedupeKey: smartDedupeKey(
        input.userId,
        "financial_health_score_improved",
        input.previousPeriodKey,
        input.currentPeriodKey
      ),
      entityId: input.currentPeriodKey,
      entityType: NOTIFICATION_ENTITY_TYPES.FINANCIAL_HEALTH,
      message: `Financial health improved from ${statusLabel[input.previousStatus]} to ${statusLabel[input.currentStatus]}.`,
      metadata: {
        currentPeriodKey: input.currentPeriodKey,
        currentStatus: input.currentStatus,
        previousPeriodKey: input.previousPeriodKey,
        previousStatus: input.previousStatus,
        statusLevelChange: rankChange
      },
      ruleKey: "financial_health_score_improved",
      severity: "SUCCESS",
      title: "Financial health improved",
      type: NOTIFICATION_TYPES.FINANCIAL_HEALTH_IMPROVED,
      userId: input.userId
    }
  ];
}

export function getRecurringReminderCandidates(input: RecurringReminderRuleInput): SmartNotificationCandidate[] {
  const rule = input.recurringTransaction;

  if (rule.status !== "ACTIVE" || rule.type !== "EXPENSE" || !rule.nextRunDate) {
    return [];
  }

  const today = normalizeDate(input.today);
  const dueDate = normalizeDate(rule.nextRunDate);
  const daysUntilDue = getDayDifference(today, dueDate);
  const dueDateKey = toDateKey(dueDate);

  if (daysUntilDue < 0) {
    return [
      {
        actionUrl: "/recurring",
        category: "RECURRING_TRANSACTION",
        dedupeKey: smartDedupeKey(input.userId, "recurring_overdue", rule.id, dueDateKey),
        entityId: rule.id,
        entityType: NOTIFICATION_ENTITY_TYPES.RECURRING_TRANSACTION,
        message: `${rule.name} was due on ${dueDateKey}.`,
        metadata: {
          dueDate: dueDateKey,
          recurringTransactionId: rule.id
        },
        ruleKey: "recurring_overdue",
        severity: "CRITICAL",
        title: "Recurring payment is overdue",
        type: NOTIFICATION_TYPES.RECURRING_TRANSACTION_OVERDUE,
        userId: input.userId
      }
    ];
  }

  if (!recurringReminderWindows.has(daysUntilDue)) {
    return [];
  }

  const label = daysUntilDue === 0 ? "today" : daysUntilDue === 1 ? "tomorrow" : `in ${daysUntilDue} days`;

  return [
    {
      actionUrl: "/recurring",
      category: "RECURRING_TRANSACTION",
      dedupeKey: smartDedupeKey(input.userId, "recurring_due_soon", rule.id, dueDateKey, String(daysUntilDue)),
      entityId: rule.id,
      entityType: NOTIFICATION_ENTITY_TYPES.RECURRING_TRANSACTION,
      message: `${rule.name} is due ${label}.`,
      metadata: {
        dueDate: dueDateKey,
        reminderWindowDays: daysUntilDue,
        recurringTransactionId: rule.id
      },
      ruleKey: "recurring_due_soon",
      severity: daysUntilDue === 0 ? "WARNING" : "INFO",
      title: "Recurring payment due soon",
      type: NOTIFICATION_TYPES.RECURRING_TRANSACTION_DUE_SOON,
      userId: input.userId
    }
  ];
}

export function getDataImportResultCandidate(input: DataImportResultRuleInput): SmartNotificationCandidate {
  const isFailed = input.result === "failed";
  const isCompletedWithErrors = input.result === "completed_with_errors";

  return {
    actionUrl: "/transactions/import",
    category: "TRANSACTION",
    dedupeKey: smartDedupeKey(input.userId, "import_result", input.importId, input.result),
    entityId: input.importId,
    entityType: NOTIFICATION_ENTITY_TYPES.IMPORT,
    message: isFailed
      ? input.safeErrorMessage || "BudgetFlow could not complete your transaction import."
      : isCompletedWithErrors
        ? `Imported ${input.importedRows ?? 0} rows, with some rows needing attention.`
        : `Imported ${input.importedRows ?? 0} rows successfully.`,
    metadata: {
      failedRows: input.failedRows ?? null,
      importId: input.importId,
      importedRows: input.importedRows ?? null,
      result: input.result
    },
    ruleKey: "import_result",
    severity: isFailed ? "CRITICAL" : isCompletedWithErrors ? "WARNING" : "SUCCESS",
    title: isFailed ? "Import failed" : isCompletedWithErrors ? "Import completed with issues" : "Import completed",
    type: isFailed
      ? NOTIFICATION_TYPES.IMPORT_FAILED
      : isCompletedWithErrors
        ? NOTIFICATION_TYPES.IMPORT_COMPLETED_WITH_ERRORS
        : NOTIFICATION_TYPES.IMPORT_COMPLETED,
    userId: input.userId
  };
}

export function getDataExportResultCandidate(input: DataExportResultRuleInput): SmartNotificationCandidate {
  const isFailed = input.result === "failed";

  return {
    actionUrl: "/reports",
    category: "SYSTEM",
    dedupeKey: smartDedupeKey(input.userId, "export_result", input.exportId, input.result),
    entityId: input.exportId,
    entityType: NOTIFICATION_ENTITY_TYPES.EXPORT,
    message: isFailed
      ? input.safeErrorMessage || "BudgetFlow could not complete your data export."
      : "Your data export is ready to download.",
    metadata: {
      exportId: input.exportId,
      result: input.result,
      rowCount: input.rowCount ?? null
    },
    ruleKey: "export_result",
    severity: isFailed ? "CRITICAL" : "SUCCESS",
    title: isFailed ? "Export failed" : "Export completed",
    type: isFailed ? NOTIFICATION_TYPES.EXPORT_FAILED : NOTIFICATION_TYPES.EXPORT_COMPLETED,
    userId: input.userId
  };
}

export function smartDedupeKey(userId: string, ruleKey: string, ...parts: Array<number | string>) {
  return ["smart", userId, ruleKey, ...parts].join(":");
}

export function getMonthPeriodKey(month: number, year: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function getBudgetMetadata(input: BudgetRuleInput, threshold: string) {
  return {
    budgetId: input.budgetId,
    categoryId: input.categoryId,
    categoryName: input.categoryName,
    limitAmount: input.limitAmount,
    month: input.month,
    percentageUsed: input.usagePercentage,
    threshold,
    usedAmount: input.usedAmount,
    year: input.year
  };
}

function uniqueCandidates(candidates: SmartNotificationCandidate[]) {
  const seen = new Set<string>();

  return candidates.filter((candidate) => {
    if (seen.has(candidate.dedupeKey)) {
      return false;
    }

    seen.add(candidate.dedupeKey);
    return true;
  });
}

function normalizeDate(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function getDayDifference(startDate: Date, endDate: Date) {
  return Math.round((normalizeDate(endDate).getTime() - normalizeDate(startDate).getTime()) / (24 * 60 * 60 * 1000));
}

function toDateKey(value: Date) {
  return normalizeDate(value).toISOString().slice(0, 10);
}
