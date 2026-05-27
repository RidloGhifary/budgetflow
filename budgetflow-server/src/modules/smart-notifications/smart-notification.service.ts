import type { TransactionPurpose, TransactionType } from "@prisma/client";

import { logger } from "../../lib/logger";
import { getMonthRange } from "../../utils/date-range";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "../audit-logs/audit-log.constants";
import { recordAuditLogSafely } from "../audit-logs/audit-log.service";
import { getUserFinancialHealth } from "../financial-health/financial-health.service";
import { createUserNotification } from "../notifications/notification.service";
import {
  findBudgetUsageForCategoryMonth,
  findRecurringReminderRule,
  getCategoryHistoricalExpenseStats,
  getMonthlyFinancialTotals
} from "./smart-notification.repository";
import {
  getBudgetRuleCandidates,
  getDataExportResultCandidate,
  getDataImportResultCandidate,
  getFinancialHealthStatusChangeCandidates,
  getLargeExpenseRuleCandidates,
  getMonthPeriodKey,
  getPeriodFinancialRuleCandidates,
  getRecurringReminderCandidates,
  type DataExportResultRuleInput,
  type DataImportResultRuleInput,
  type SmartNotificationCandidate
} from "./smart-notification.rules";

interface SmartTransactionInput {
  amount: number;
  category: {
    id: string;
    name: string;
  };
  categoryId: string;
  id: string;
  purpose: TransactionPurpose;
  transactionDate: Date | string;
  type: TransactionType;
}

export async function createSmartNotificationsSafely(candidates: SmartNotificationCandidate[]) {
  for (const candidate of candidates) {
    await createSmartNotificationSafely(candidate);
  }
}

export async function evaluateSmartNotificationsForTransactionSafely(userId: string, transaction: SmartTransactionInput) {
  await runSmartEvaluationSafely(
    userId,
    "transaction",
    async () => {
      const transactionDate = new Date(transaction.transactionDate);
      const month = transactionDate.getUTCMonth() + 1;
      const year = transactionDate.getUTCFullYear();
      const budgetUsage = await findBudgetUsageForCategoryMonth(userId, {
        categoryId: transaction.categoryId,
        month,
        year
      });
      const candidates: SmartNotificationCandidate[] = [];

      if (budgetUsage) {
        candidates.push(
          ...getBudgetRuleCandidates({
            budgetId: budgetUsage.budget.id,
            categoryId: budgetUsage.budget.categoryId,
            categoryName: budgetUsage.budget.category.name,
            limitAmount: budgetUsage.limitAmount,
            month,
            usagePercentage: budgetUsage.usagePercentage,
            usedAmount: budgetUsage.usedAmount,
            userId,
            year
          })
        );
      }

      if (transaction.type === "EXPENSE" && transaction.purpose === "NORMAL") {
        const stats = await getCategoryHistoricalExpenseStats(userId, {
          categoryId: transaction.categoryId,
          excludeTransactionId: transaction.id,
          transactionDate
        });

        candidates.push(
          ...getLargeExpenseRuleCandidates({
            historicalAverageAmount: stats.averageAmount,
            historicalExpenseCount: stats.count,
            transaction: {
              amount: transaction.amount,
              categoryId: transaction.categoryId,
              categoryName: transaction.category.name,
              id: transaction.id,
              purpose: transaction.purpose,
              type: transaction.type
            },
            userId
          })
        );
      }

      await createSmartNotificationsSafely(candidates);
      await evaluateSmartPeriodNotificationsForUser(userId, month, year);
    }
  );
}

export async function evaluateSmartBudgetNotificationsSafely(
  userId: string,
  input: {
    categoryId: string;
    month: number;
    year: number;
  }
) {
  await runSmartEvaluationSafely(
    userId,
    "budget",
    async () => {
      const usage = await findBudgetUsageForCategoryMonth(userId, input);

      if (!usage) {
        return;
      }

      await createSmartNotificationsSafely(
        getBudgetRuleCandidates({
          budgetId: usage.budget.id,
          categoryId: usage.budget.categoryId,
          categoryName: usage.budget.category.name,
          limitAmount: usage.limitAmount,
          month: input.month,
          usagePercentage: usage.usagePercentage,
          usedAmount: usage.usedAmount,
          userId,
          year: input.year
        })
      );
    }
  );
}

export async function evaluateSmartPeriodNotificationsForUserSafely(userId: string, date: Date | string) {
  const periodDate = new Date(date);

  await runSmartEvaluationSafely(userId, "period", async () => {
    await evaluateSmartPeriodNotificationsForUser(userId, periodDate.getUTCMonth() + 1, periodDate.getUTCFullYear());
  });
}

export async function evaluateSmartRecurringNotificationsForRuleSafely(userId: string, recurringTransactionId: string) {
  await runSmartEvaluationSafely(
    userId,
    "recurring",
    async () => {
      const recurringTransaction = await findRecurringReminderRule(userId, recurringTransactionId);

      if (!recurringTransaction) {
        return;
      }

      await createSmartNotificationsSafely(
        getRecurringReminderCandidates({
          recurringTransaction,
          today: new Date(),
          userId
        })
      );
    }
  );
}

export async function createSmartDataImportResultNotificationSafely(input: DataImportResultRuleInput) {
  await createSmartNotificationsSafely([getDataImportResultCandidate(input)]);
}

export async function createSmartDataExportResultNotificationSafely(input: DataExportResultRuleInput) {
  await createSmartNotificationsSafely([getDataExportResultCandidate(input)]);
}

async function evaluateSmartPeriodNotificationsForUser(userId: string, month: number, year: number) {
  const previousMonth = getPreviousMonth(month, year);
  const currentPeriodKey = getMonthPeriodKey(month, year);
  const previousPeriodKey = getMonthPeriodKey(previousMonth.month, previousMonth.year);
  const [currentTotals, previousTotals, currentHealth, previousHealth] = await Promise.all([
    getMonthlyFinancialTotals(userId, month, year),
    getMonthlyFinancialTotals(userId, previousMonth.month, previousMonth.year),
    getFinancialHealthForMonth(userId, month, year),
    getFinancialHealthForMonth(userId, previousMonth.month, previousMonth.year)
  ]);

  await createSmartNotificationsSafely([
    ...getPeriodFinancialRuleCandidates({
      currentExpenseTotal: currentTotals.expenseTotal,
      currentIncomeTotal: currentTotals.incomeTotal,
      periodKey: currentPeriodKey,
      previousExpenseTotal: previousTotals.expenseTotal > 0 ? previousTotals.expenseTotal : null,
      userId
    }),
    ...getFinancialHealthStatusChangeCandidates({
      currentPeriodKey,
      currentStatus: currentHealth.status,
      previousPeriodKey,
      previousStatus: previousHealth.metadata.hasEnoughData ? previousHealth.status : null,
      userId
    })
  ]);
}

async function getFinancialHealthForMonth(userId: string, month: number, year: number) {
  const period = getMonthRange(month, year);
  const previousMonth = getPreviousMonth(month, year);
  const previousPeriod = getMonthRange(previousMonth.month, previousMonth.year);

  return getUserFinancialHealth(userId, {
    compareEndDate: addDays(previousPeriod.endDate, -1),
    compareStartDate: previousPeriod.startDate,
    endDate: addDays(period.endDate, -1),
    startDate: period.startDate
  });
}

async function createSmartNotificationSafely(candidate: SmartNotificationCandidate) {
  try {
    const notification = await createUserNotification({
      actionUrl: candidate.actionUrl,
      category: candidate.category,
      dedupeKey: candidate.dedupeKey,
      entityId: candidate.entityId,
      entityType: candidate.entityType,
      message: candidate.message,
      metadata: {
        ...candidate.metadata,
        ruleKey: candidate.ruleKey
      },
      severity: candidate.severity,
      title: candidate.title,
      type: candidate.type,
      userId: candidate.userId
    });

    if (!notification) {
      return;
    }

    await recordAuditLogSafely({
      action: AUDIT_ACTIONS.SMART_NOTIFICATION_CREATED,
      entityId: notification.id,
      entityType: AUDIT_ENTITY_TYPES.NOTIFICATION,
      metadata: {
        dedupeKey: candidate.dedupeKey,
        notificationType: candidate.type,
        ruleKey: candidate.ruleKey,
        sourceEntityId: candidate.entityId,
        sourceEntityType: candidate.entityType
      },
      userId: candidate.userId
    });
  } catch (error) {
    logger.error(
      {
        dedupeKey: candidate.dedupeKey,
        entityId: candidate.entityId,
        entityType: candidate.entityType,
        error,
        ruleKey: candidate.ruleKey,
        userId: candidate.userId
      },
      "smart notification write failed"
    );
  }
}

async function runSmartEvaluationSafely(userId: string, source: string, callback: () => Promise<void>) {
  try {
    await callback();
  } catch (error) {
    logger.error(
      {
        error,
        source,
        userId
      },
      "smart notification evaluation failed"
    );
  }
}

function getPreviousMonth(month: number, year: number) {
  const date = new Date(Date.UTC(year, month - 2, 1));

  return {
    month: date.getUTCMonth() + 1,
    year: date.getUTCFullYear()
  };
}

function addDays(date: Date, days: number) {
  const result = new Date(date);

  result.setUTCDate(result.getUTCDate() + days);

  return result;
}
