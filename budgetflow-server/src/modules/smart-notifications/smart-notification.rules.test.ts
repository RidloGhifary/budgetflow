import assert from "node:assert/strict";
import test from "node:test";

import {
  getBudgetRuleCandidates,
  getDataExportResultCandidate,
  getDataImportResultCandidate,
  getFinancialHealthStatusChangeCandidates,
  getLargeExpenseRuleCandidates,
  getNegativeCashflowCandidates,
  getLowSavingsRateCandidates,
  getRecurringReminderCandidates,
  getSpendingTrendCandidates
} from "./smart-notification.rules";

test("budget below 80 percent creates no notification", () => {
  assert.equal(getBudgetRuleCandidates(budgetInput(79)).length, 0);
});

test("budget at or above 80 percent creates near-limit notification", () => {
  const candidates = getBudgetRuleCandidates(budgetInput(80));

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].type, "budget.threshold_80");
  assert.equal(candidates[0].severity, "WARNING");
});

test("budget above 100 percent creates exceeded notification", () => {
  const candidates = getBudgetRuleCandidates(budgetInput(106));

  assert.ok(candidates.some((candidate) => candidate.type === "budget.exceeded"));
  assert.ok(!candidates.some((candidate) => candidate.type === "budget.threshold_80"));
});

test("budget above 120 percent creates critically exceeded notification separately", () => {
  const candidates = getBudgetRuleCandidates(budgetInput(132));

  assert.ok(candidates.some((candidate) => candidate.type === "budget.exceeded"));
  assert.ok(candidates.some((candidate) => candidate.type === "budget.critically_exceeded"));
  assert.equal(new Set(candidates.map((candidate) => candidate.dedupeKey)).size, candidates.length);
});

test("same budget period uses the same deterministic dedupe key", () => {
  const first = getBudgetRuleCandidates(budgetInput(85))[0];
  const second = getBudgetRuleCandidates(budgetInput(90))[0];
  const otherUser = getBudgetRuleCandidates({ ...budgetInput(85), userId: "user-2" })[0];

  assert.equal(first.dedupeKey, second.dedupeKey);
  assert.notEqual(first.dedupeKey, otherUser.dedupeKey);
});

test("large expense ignores income and insufficient history", () => {
  assert.equal(
    getLargeExpenseRuleCandidates({
      historicalAverageAmount: 100,
      historicalExpenseCount: 10,
      transaction: transactionInput({ type: "INCOME" }),
      userId: "user-1"
    }).length,
    0
  );
  assert.equal(
    getLargeExpenseRuleCandidates({
      historicalAverageAmount: 100,
      historicalExpenseCount: 2,
      transaction: transactionInput({ amount: 250 }),
      userId: "user-1"
    }).length,
    0
  );
});

test("large expense triggers at two times category average", () => {
  assert.equal(
    getLargeExpenseRuleCandidates({
      historicalAverageAmount: 100,
      historicalExpenseCount: 3,
      transaction: transactionInput({ amount: 199 }),
      userId: "user-1"
    }).length,
    0
  );

  const candidates = getLargeExpenseRuleCandidates({
    historicalAverageAmount: 100,
    historicalExpenseCount: 3,
    transaction: transactionInput({ amount: 200 }),
    userId: "user-1"
  });

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].type, "transaction.large_expense");
});

test("spending trend triggers only above 25 percent increase with previous data", () => {
  assert.equal(
    getSpendingTrendCandidates({
      currentExpenseTotal: 1000,
      currentIncomeTotal: 2000,
      periodKey: "2026-05",
      previousExpenseTotal: null,
      userId: "user-1"
    }).length,
    0
  );
  assert.equal(
    getSpendingTrendCandidates({
      currentExpenseTotal: 1250,
      currentIncomeTotal: 2000,
      periodKey: "2026-05",
      previousExpenseTotal: 1000,
      userId: "user-1"
    }).length,
    0
  );
  assert.equal(
    getSpendingTrendCandidates({
      currentExpenseTotal: 1260,
      currentIncomeTotal: 2000,
      periodKey: "2026-05",
      previousExpenseTotal: 1000,
      userId: "user-1"
    })[0].type,
    "financial_health.spending_increased"
  );
});

test("negative cashflow triggers only when expenses are higher than income", () => {
  assert.equal(
    getNegativeCashflowCandidates({
      currentExpenseTotal: 0,
      currentIncomeTotal: 0,
      periodKey: "2026-05",
      previousExpenseTotal: null,
      userId: "user-1"
    }).length,
    0
  );
  assert.equal(
    getNegativeCashflowCandidates({
      currentExpenseTotal: 900,
      currentIncomeTotal: 1000,
      periodKey: "2026-05",
      previousExpenseTotal: null,
      userId: "user-1"
    }).length,
    0
  );
  assert.equal(
    getNegativeCashflowCandidates({
      currentExpenseTotal: 1100,
      currentIncomeTotal: 1000,
      periodKey: "2026-05",
      previousExpenseTotal: null,
      userId: "user-1"
    })[0].severity,
    "CRITICAL"
  );
});

test("low savings rate triggers only for non-negative savings below 10 percent", () => {
  assert.equal(
    getLowSavingsRateCandidates({
      currentExpenseTotal: 100,
      currentIncomeTotal: 0,
      periodKey: "2026-05",
      previousExpenseTotal: null,
      userId: "user-1"
    }).length,
    0
  );
  assert.equal(
    getLowSavingsRateCandidates({
      currentExpenseTotal: 1100,
      currentIncomeTotal: 1000,
      periodKey: "2026-05",
      previousExpenseTotal: null,
      userId: "user-1"
    }).length,
    0
  );
  assert.equal(
    getLowSavingsRateCandidates({
      currentExpenseTotal: 950,
      currentIncomeTotal: 1000,
      periodKey: "2026-05",
      previousExpenseTotal: null,
      userId: "user-1"
    })[0].type,
    "financial_health.low_savings_rate"
  );
  assert.equal(
    getLowSavingsRateCandidates({
      currentExpenseTotal: 800,
      currentIncomeTotal: 1000,
      periodKey: "2026-05",
      previousExpenseTotal: null,
      userId: "user-1"
    }).length,
    0
  );
});

test("financial health status changes create drop and improvement notifications", () => {
  assert.equal(
    getFinancialHealthStatusChangeCandidates({
      currentPeriodKey: "2026-05",
      currentStatus: "not_enough_data",
      previousPeriodKey: "2026-04",
      previousStatus: "good",
      userId: "user-1"
    }).length,
    0
  );
  assert.equal(
    getFinancialHealthStatusChangeCandidates({
      currentPeriodKey: "2026-05",
      currentStatus: "good",
      previousPeriodKey: "2026-04",
      previousStatus: null,
      userId: "user-1"
    }).length,
    0
  );

  const oneLevelDrop = getFinancialHealthStatusChangeCandidates({
    currentPeriodKey: "2026-05",
    currentStatus: "fair",
    previousPeriodKey: "2026-04",
    previousStatus: "good",
    userId: "user-1"
  })[0];
  const criticalDrop = getFinancialHealthStatusChangeCandidates({
    currentPeriodKey: "2026-05",
    currentStatus: "critical",
    previousPeriodKey: "2026-04",
    previousStatus: "good",
    userId: "user-1"
  })[0];
  const improved = getFinancialHealthStatusChangeCandidates({
    currentPeriodKey: "2026-05",
    currentStatus: "excellent",
    previousPeriodKey: "2026-04",
    previousStatus: "fair",
    userId: "user-1"
  })[0];

  assert.equal(oneLevelDrop.severity, "WARNING");
  assert.equal(criticalDrop.severity, "CRITICAL");
  assert.equal(improved.severity, "SUCCESS");
});

test("recurring reminder rules handle inactive, due windows, and overdue states", () => {
  const today = new Date("2026-05-26T00:00:00.000Z");

  assert.equal(
    getRecurringReminderCandidates({
      recurringTransaction: recurringInput({ nextRunDate: new Date("2026-05-29T00:00:00.000Z"), status: "PAUSED" }),
      today,
      userId: "user-1"
    }).length,
    0
  );
  assert.equal(
    getRecurringReminderCandidates({
      recurringTransaction: recurringInput({ nextRunDate: new Date("2026-05-28T00:00:00.000Z") }),
      today,
      userId: "user-1"
    }).length,
    0
  );

  const dueSoon = getRecurringReminderCandidates({
    recurringTransaction: recurringInput({ nextRunDate: new Date("2026-05-29T00:00:00.000Z") }),
    today,
    userId: "user-1"
  })[0];
  const overdue = getRecurringReminderCandidates({
    recurringTransaction: recurringInput({ nextRunDate: new Date("2026-05-25T00:00:00.000Z") }),
    today,
    userId: "user-1"
  })[0];

  assert.equal(dueSoon.type, "recurring_transaction.due_soon");
  assert.equal(overdue.type, "recurring_transaction.overdue");
  assert.notEqual(dueSoon.dedupeKey, overdue.dedupeKey);
});

test("import and export result candidates are deterministic and severity mapped", () => {
  const importCompleted = getDataImportResultCandidate({
    importId: "import-1",
    importedRows: 12,
    result: "completed",
    userId: "user-1"
  });
  const importFailed = getDataImportResultCandidate({
    importId: "import-1",
    result: "failed",
    userId: "user-1"
  });
  const exportCompleted = getDataExportResultCandidate({
    exportId: "export-1",
    result: "completed",
    rowCount: 10,
    userId: "user-1"
  });
  const exportFailed = getDataExportResultCandidate({
    exportId: "export-1",
    result: "failed",
    userId: "user-1"
  });

  assert.equal(importCompleted.severity, "SUCCESS");
  assert.equal(importFailed.severity, "CRITICAL");
  assert.equal(exportCompleted.severity, "SUCCESS");
  assert.equal(exportFailed.severity, "CRITICAL");
  assert.notEqual(importCompleted.dedupeKey, importFailed.dedupeKey);
});

function budgetInput(usagePercentage: number) {
  return {
    budgetId: "budget-1",
    categoryId: "category-1",
    categoryName: "Food",
    limitAmount: 100,
    month: 5,
    usagePercentage,
    usedAmount: usagePercentage,
    userId: "user-1",
    year: 2026
  };
}

function transactionInput(overrides: Partial<Parameters<typeof getLargeExpenseRuleCandidates>[0]["transaction"]> = {}) {
  return {
    amount: 100,
    categoryId: "category-1",
    categoryName: "Food",
    id: "transaction-1",
    purpose: "NORMAL" as const,
    type: "EXPENSE" as const,
    ...overrides
  };
}

function recurringInput(
  overrides: Partial<Parameters<typeof getRecurringReminderCandidates>[0]["recurringTransaction"]> = {}
) {
  return {
    id: "recurring-1",
    name: "Netflix",
    nextRunDate: new Date("2026-05-29T00:00:00.000Z"),
    status: "ACTIVE" as const,
    type: "EXPENSE" as const,
    ...overrides
  };
}
