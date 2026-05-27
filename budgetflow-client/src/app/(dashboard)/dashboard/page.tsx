"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpToLine,
  ReceiptText,
  RefreshCw,
  TrendingUp,
  WalletCards
} from "lucide-react";

import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { DashboardList } from "@/components/dashboard/dashboard-list";
import { FinancialHealthCard } from "@/components/dashboard/financial-health-card";
import { SecondaryMetricCard } from "@/components/dashboard/secondary-metric-card";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { SensitiveValue } from "@/components/privacy/sensitive-value";
import { MonthYearSelector, formatMonthYear, getCurrentMonthYear } from "@/components/shared/month-year-selector";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { useDashboardSummary } from "@/hooks/use-dashboard-summary";
import { useFinancialHealth } from "@/hooks/use-financial-health";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import type { DashboardSummary } from "@/types/api";
import type { FinancialSummary, SecondaryMetric, StatusTone } from "@/types/finance";

const summaryIcons = [ArrowDownToLine, ArrowUpToLine, TrendingUp, WalletCards];

export default function DashboardPage() {
  const [period, setPeriod] = useState(getCurrentMonthYear);
  const filters = useMemo(
    () => ({
      month: period.month,
      year: period.year
    }),
    [period.month, period.year]
  );
  const financialHealthFilters = useMemo(() => getFinancialHealthFilters(period.month, period.year), [period.month, period.year]);
  const { errorMessage, isLoading, reload, summary } = useDashboardSummary(filters);
  const {
    errorMessage: financialHealthErrorMessage,
    financialHealth,
    isLoading: isFinancialHealthLoading,
    reload: reloadFinancialHealth
  } = useFinancialHealth(financialHealthFilters);
  const periodLabel = formatMonthYear(period.month, period.year);

  const financialSummaries = useMemo(
    () => buildFinancialSummaries(summary),
    [summary]
  );
  const secondaryMetrics = useMemo(
    () => buildSecondaryMetrics(summary),
    [summary]
  );
  const recentItems = useMemo(
    () =>
      (summary?.recentTransactions ?? []).slice(0, 5).map((transaction) => ({
        id: transaction.id,
        label: transaction.note?.trim() || transaction.category?.name || (transaction.type === "INCOME" ? "Income" : "Expense"),
        helper: `${transaction.category?.name ?? "Unknown category"} - ${transaction.wallet?.name ?? "Unknown wallet"} - ${formatDate(transaction.transactionDate)}`,
        value: (
          <SensitiveValue
            format="currency"
            mask={transaction.type === "INCOME" ? "+Rp *****" : "-Rp *****"}
            value={transaction.type === "INCOME" ? transaction.amount : -transaction.amount}
          >
            {transaction.type === "INCOME" ? `+${formatCurrency(transaction.amount)}` : formatCurrency(-transaction.amount)}
          </SensitiveValue>
        ),
        icon: transaction.type === "INCOME" ? ArrowDownToLine : ReceiptText,
        tone: transaction.type === "INCOME" ? ("success" as const) : ("danger" as const)
      })),
    [summary]
  );
  const overBudgetItems = useMemo(
    () =>
      (summary?.overBudgetCategories ?? []).map((budget) => ({
        id: budget.budgetId,
        label: budget.categoryName,
        helper: (
          <>
            {formatPercent(budget.usagePercentage)} used of{" "}
            <SensitiveValue format="currency" value={budget.limitAmount} />
          </>
        ),
        value: <SensitiveValue format="currency" value={budget.overAmount} />,
        icon: AlertTriangle,
        tone: "danger" as const
      })),
    [summary]
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Summary for income, expenses, budgets, and wallet movement in ${periodLabel}.`}
        actions={
          <>
            <MonthYearSelector
              disabled={isLoading || isFinancialHealthLoading}
              month={period.month}
              onChange={setPeriod}
              year={period.year}
            />
            <Button
              disabled={isLoading || isFinancialHealthLoading}
              onClick={() => {
                void reload();
                void reloadFinancialHealth();
              }}
              type="button"
              variant="outline"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </>
        }
      />

      {isLoading ? <DashboardSkeleton /> : null}

      {!isLoading && errorMessage ? (
        <SectionCard title="Could not load dashboard" description={errorMessage}>
          <Button onClick={() => void reload()} type="button">
            Retry
          </Button>
        </SectionCard>
      ) : null}

      {!isLoading && !errorMessage && summary ? (
        <>
          <section className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
            {financialSummaries.map((item, index) => (
              <SummaryCard key={item.label} summary={item} icon={summaryIcons[index]} />
            ))}
          </section>

          <section className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
            {secondaryMetrics.map((metric) => (
              <SecondaryMetricCard key={metric.label} badgeLabel={periodLabel} metric={metric} />
            ))}
          </section>

          <FinancialHealthCard
            errorMessage={financialHealthErrorMessage}
            financialHealth={financialHealth}
            isLoading={isFinancialHealthLoading}
            onRetry={() => void reloadFinancialHealth()}
          />

          <DashboardCharts expenseByCategory={summary.expenseByCategory} incomeVsExpense={summary.incomeVsExpense} />

          <section className="grid gap-4 sm:gap-5 xl:grid-cols-2">
            <SectionCard title="Recent Transactions" description="Latest income and expense records.">
              <DashboardList emptyMessage="No transactions in this period." items={recentItems} />
            </SectionCard>

            <SectionCard title="Over Budget Categories" description="Categories above their selected-month limits.">
              <DashboardList emptyMessage="No category is over budget." items={overBudgetItems} />
            </SectionCard>
          </section>
        </>
      ) : null}
    </div>
  );
}

function getFinancialHealthFilters(month: number, year: number) {
  const currentStart = new Date(Date.UTC(year, month - 1, 1));
  const currentEnd = new Date(Date.UTC(year, month, 0));
  const compareStart = new Date(Date.UTC(year, month - 2, 1));
  const compareEnd = new Date(Date.UTC(year, month - 1, 0));

  return {
    compareEndDate: toDateKey(compareEnd),
    compareStartDate: toDateKey(compareStart),
    endDate: toDateKey(currentEnd),
    startDate: toDateKey(currentStart)
  };
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildFinancialSummaries(summary: DashboardSummary | null): FinancialSummary[] {
  const financialSummary = summary?.financialSummary ?? {
    availableBalance: 0,
    debtCollections: 0,
    debtPayments: 0,
    netCashFlow: 0,
    normalExpense: 0,
    savingContributions: 0,
    totalExpense: 0,
    totalIncome: 0
  };

  return [
    {
      label: "Income",
      amount: financialSummary.totalIncome,
      comparison: "Selected total",
      trend: "flat",
      helper: "Selected month"
    },
    {
      label: "Expense",
      amount: financialSummary.totalExpense,
      comparison: "Selected total",
      trend: "flat",
      helper: "All expense purposes"
    },
    {
      label: "Net Cash Flow",
      amount: financialSummary.netCashFlow,
      comparison: financialSummary.netCashFlow >= 0 ? "Positive flow" : "Negative flow",
      trend: "flat",
      helper: "Income minus expense"
    },
    {
      label: "Available Balance",
      amount: financialSummary.availableBalance,
      comparison: "Wallet balance",
      trend: "flat",
      helper: "Across wallets",
      featured: true
    }
  ];
}

function buildSecondaryMetrics(summary: DashboardSummary | null): SecondaryMetric[] {
  const budgetSummary = summary?.budgetSummary;
  const usagePercentage = budgetSummary?.overallUsagePercentage ?? 0;
  const topCategory = summary?.topExpenseCategory;

  return [
    {
      label: "Budget Usage",
      value: <SensitiveValue format="currency" value={budgetSummary?.totalUsedAmount ?? 0} />,
      helper: (
        <>
          {formatPercent(usagePercentage)} of{" "}
          <SensitiveValue format="currency" value={budgetSummary?.totalLimitAmount ?? 0} />
        </>
      ),
      progress: clampProgress(usagePercentage),
      tone: getMetricTone(usagePercentage)
    },
    {
      label: "Remaining Budget",
      value: <SensitiveValue format="currency" value={budgetSummary?.totalRemainingAmount ?? 0} />,
      helper: `${budgetSummary?.safeBudgetCount ?? 0} safe, ${budgetSummary?.warningBudgetCount ?? 0} warning`,
      tone: (budgetSummary?.totalRemainingAmount ?? 0) < 0 ? "danger" : "success"
    },
    {
      label: "Top Expense",
      value: topCategory?.categoryName ?? "None",
      helper: topCategory ? (
        <>
          <SensitiveValue format="currency" value={topCategory.totalAmount} /> - {formatPercent(topCategory.percentage)}
        </>
      ) : (
        "No spending data"
      ),
      progress: topCategory ? clampProgress(topCategory.percentage) : undefined,
      tone: "primary"
    },
    {
      label: "Over Budget",
      value: `${budgetSummary?.overBudgetCount ?? 0}`,
      helper: "Categories above limit",
      tone: (budgetSummary?.overBudgetCount ?? 0) > 0 ? "danger" : "success"
    }
  ];
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <section className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-lg border border-border bg-card p-4 shadow-soft sm:p-5">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="mt-4 h-8 w-36 animate-pulse rounded bg-muted" />
            <div className="mt-5 h-6 w-full animate-pulse rounded bg-muted" />
          </div>
        ))}
      </section>
      <SectionCard title="Loading dashboard" description="Loading dashboard summary.">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-[260px] animate-pulse rounded-lg bg-muted" />
          <div className="h-[260px] animate-pulse rounded-lg bg-muted" />
        </div>
      </SectionCard>
    </div>
  );
}

function clampProgress(value: number) {
  return Math.max(0, Math.min(Math.round(value), 100));
}

function getMetricTone(value: number): StatusTone {
  if (value >= 100) {
    return "danger";
  }

  if (value >= 80) {
    return "warning";
  }

  return "success";
}
