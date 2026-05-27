"use client";

import type { ReactNode } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CircleDollarSign,
  CreditCard,
  PiggyBank,
  ReceiptText,
  Target,
  WalletCards
} from "lucide-react";

import { ProgressIndicator } from "@/components/shared/progress-indicator";
import { PaginationControls, useClientPagination } from "@/components/shared/pagination";
import { SensitiveText, SensitiveValue } from "@/components/privacy/sensitive-value";
import { SectionCard } from "@/components/shared/section-card";
import { StatTile } from "@/components/shared/stat-tile";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import type { ReportData } from "@/hooks/use-reports";
import { formatDate, formatPercent } from "@/lib/format";
import { debtTypeLabels, transactionPurposeLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type {
  BudgetReport,
  BudgetSummary,
  DebtReport,
  DebtSummary,
  MonthlyReport,
  RangeReport,
  ReportCategoryBreakdownItem,
  ReportFinancialSummary,
  ReportTransaction,
  ReportType,
  SavingGoalReport,
  SavingGoalSummary
} from "@/types/api";

interface ReportPreviewProps {
  errorMessage?: string | null;
  isLoading: boolean;
  onRetry: () => void;
  report: ReportData | null;
  reportType: ReportType;
  validationMessage?: string | null;
}

interface TableColumn<T> {
  align?: "left" | "right";
  header: string;
  render: (row: T) => ReactNode;
}

export function ReportPreview({ errorMessage, isLoading, onRetry, report, reportType, validationMessage }: ReportPreviewProps) {
  if (validationMessage) {
    return (
      <SectionCard title="Check report filters" description={validationMessage}>
        <p className="text-sm text-muted-foreground">The report request will run after the filters are valid.</p>
      </SectionCard>
    );
  }

  if (isLoading) {
    return <ReportSkeleton />;
  }

  if (errorMessage) {
    return (
      <SectionCard title="Could not load report" description={errorMessage}>
        <Button onClick={onRetry} type="button">
          Retry
        </Button>
      </SectionCard>
    );
  }

  if (!report) {
    return (
      <SectionCard title="No report loaded" description="Choose a report type and filters to preview financial report data.">
        <p className="text-sm text-muted-foreground">Reports will appear here after data is available.</p>
      </SectionCard>
    );
  }

  switch (reportType) {
    case "monthly":
      return <SummaryReportPreview report={report as MonthlyReport} />;
    case "range":
      return <RangeReportPreview report={report as RangeReport} />;
    case "transactions":
      return <TransactionReportPreview report={report as Extract<ReportData, { transactions: ReportTransaction[] }>} />;
    case "budgets":
      return <BudgetReportPreview report={report as BudgetReport} />;
    case "debts":
      return <DebtReportPreview report={report as DebtReport} />;
    case "goals":
      return <SavingGoalReportPreview report={report as SavingGoalReport} />;
  }
}

function SummaryReportPreview({ report }: { report: MonthlyReport }) {
  return (
    <div className="space-y-6">
      <FinancialSummaryCards report={report} />
      <CategoryBreakdownSections expenseByCategory={safeArray(report.expenseByCategory)} incomeByCategory={safeArray(report.incomeByCategory)} />
      <BudgetItemsSection items={report.budgetSummary?.items} title="Budget Summary" />
      <DebtSummarySection summary={report.debtSummary} />
      <SavingGoalSummarySection summary={report.savingGoalSummary} />
      <TransactionTableSection rows={report.recentTransactions} title="Recent Transactions" />
    </div>
  );
}

function RangeReportPreview({ report }: { report: RangeReport }) {
  const budgetItems = safeArray(report.budgetSummaries).flatMap((summary) => safeArray(summary.items));

  return (
    <div className="space-y-6">
      <SectionCard title="Selected Range" description={report.period?.label ?? "Custom date range"}>
        <p className="text-sm text-muted-foreground">
          Start date is inclusive. End date is treated as the next day exclusive.
        </p>
      </SectionCard>
      <FinancialSummaryCards report={report} />
      <CategoryBreakdownSections expenseByCategory={safeArray(report.expenseByCategory)} incomeByCategory={safeArray(report.incomeByCategory)} />
      <TransactionTableSection rows={report.recentTransactions} title="Recent Transactions" />
      <BudgetItemsSection items={budgetItems} title="Budget Summaries In Range" />
      <DebtSummarySection summary={report.debtSummary} />
      <SavingGoalSummarySection summary={report.savingGoalSummary} />
    </div>
  );
}

function TransactionReportPreview({ report }: { report: { transactions?: ReportTransaction[] } }) {
  return <TransactionTableSection rows={report.transactions} title="Transaction Report" />;
}

function BudgetReportPreview({ report }: { report: BudgetReport }) {
  const summary = getBudgetSummary(report.summary);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile helper={`${summary.items.length} budget categories`} icon={ReceiptText} label="Limit" value={<CurrencyValue value={summary.totalLimitAmount} />} />
        <StatTile helper={<SensitiveText text={`${formatPercent(summary.overallUsagePercentage)} overall usage`} />} icon={CircleDollarSign} label="Used" tone="warning" value={<CurrencyValue value={summary.totalUsedAmount} />} />
        <StatTile helper={`${summary.safeBudgetCount} safe budgets`} icon={WalletCards} label="Remaining" tone="success" value={<CurrencyValue value={summary.totalRemainingAmount} />} />
        <StatTile helper={`${summary.overBudgetCount} over budget`} icon={CreditCard} label="Over Budget" tone={summary.overBudgetCount > 0 ? "danger" : "primary"} value={`${summary.overBudgetCount}`} />
      </section>
      <BudgetItemsSection items={summary.items} title="Budget Report" emptyMessage="No budget data available for this report." />
    </div>
  );
}

function DebtReportPreview({ report }: { report: DebtReport }) {
  const filteredTotals = report.filteredTotals ?? { debtCount: safeArray(report.debts).length };

  return (
    <div className="space-y-6">
      <DebtSummarySection summary={report.summary} />
      <SectionCard title="Debt Report" description={`${filteredTotals.debtCount} debt records match the current filters.`}>
        <DataTable
          columns={[
            { header: "Type", render: (debt) => debtTypeLabels[debt.type] },
            { header: "Title", render: (debt) => debt.title },
            { header: "Person", render: (debt) => debt.personName },
            { align: "right", header: "Total", render: (debt) => <CurrencyValue value={debt.totalAmount} /> },
            { align: "right", header: "Paid", render: (debt) => <CurrencyValue value={debt.paidAmount} /> },
            { align: "right", header: "Remaining", render: (debt) => <CurrencyValue value={debt.remainingAmount} /> },
            { header: "Due Date", render: (debt) => formatMaybeDate(debt.dueDate) },
            { header: "Status", render: (debt) => <StatusBadge status={debt.status} /> }
          ]}
          emptyMessage="No debts match the selected filters."
          rows={report.debts}
        />
      </SectionCard>
    </div>
  );
}

function SavingGoalReportPreview({ report }: { report: SavingGoalReport }) {
  const filteredTotals = report.filteredTotals ?? { goalCount: safeArray(report.goals).length };

  return (
    <div className="space-y-6">
      <SavingGoalSummarySection summary={report.summary} />
      <SectionCard title="Saving Goal Report" description={`${filteredTotals.goalCount} saving goals match the current filters.`}>
        <DataTable
          columns={[
            { header: "Goal", render: (goal) => goal.name },
            { align: "right", header: "Target", render: (goal) => <CurrencyValue value={goal.targetAmount} /> },
            { align: "right", header: "Saved", render: (goal) => <CurrencyValue value={goal.currentAmount} /> },
            { align: "right", header: "Remaining", render: (goal) => <CurrencyValue value={goal.remainingAmount} /> },
            {
              header: "Progress",
              render: (goal) => (
                <div className="min-w-36">
                  <ProgressIndicator label={<SensitiveValue format="percent" value={goal.progressPercentage} />} value={capPercentage(goal.progressPercentage)} />
                </div>
              )
            },
            { header: "Deadline", render: (goal) => formatMaybeDate(goal.deadline) },
            { header: "Status", render: (goal) => <StatusBadge status={goal.status} /> }
          ]}
          emptyMessage="No saving goals match the selected filters."
          rows={report.goals}
        />
      </SectionCard>
    </div>
  );
}

function FinancialSummaryCards({ report }: { report: MonthlyReport | RangeReport }) {
  const summary = getFinancialSummary(report.financialSummary);
  const debtPayments = report.periodDebtPayments ?? { paymentCount: 0, totalAmount: 0 };
  const contributions = report.periodSavingContributions ?? { contributionCount: 0, totalAmount: 0 };

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatTile helper={`${summary.incomeTransactionCount} income transactions`} icon={ArrowUpCircle} label="Total Income" tone="success" value={<CurrencyValue value={summary.totalIncome} />} />
      <StatTile helper={`${summary.expenseTransactionCount} expense transactions`} icon={ArrowDownCircle} label="Total Expense" tone="danger" value={<CurrencyValue value={summary.totalExpense} />} />
      <StatTile helper={`${summary.transactionCount} total transactions`} icon={CircleDollarSign} label="Net Cash Flow" tone={summary.netCashFlow >= 0 ? "success" : "danger"} value={<CurrencyValue value={summary.netCashFlow} />} />
      <StatTile helper="Current wallet snapshot" icon={WalletCards} label="Available Balance" value={<CurrencyValue value={summary.availableBalance ?? 0} />} />
      <StatTile helper="Normal expense only" icon={ReceiptText} label="Normal Expense" tone="warning" value={<CurrencyValue value={summary.normalExpense} />} />
      <StatTile helper={`${debtPayments.paymentCount} debt payments`} icon={CreditCard} label="Debt Payments" tone="danger" value={<CurrencyValue value={summary.debtPayments} />} />
      <StatTile helper="Income from debt collections" icon={ArrowUpCircle} label="Debt Collections" tone="success" value={<CurrencyValue value={summary.debtCollections} />} />
      <StatTile helper={`${contributions.contributionCount} contributions`} icon={PiggyBank} label="Saving Contributions" tone="blue" value={<CurrencyValue value={summary.savingContributions} />} />
    </section>
  );
}

function CategoryBreakdownSections({
  expenseByCategory,
  incomeByCategory
}: {
  expenseByCategory: ReportCategoryBreakdownItem[];
  incomeByCategory: ReportCategoryBreakdownItem[];
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <CategoryBreakdown title="Expense By Category" rows={expenseByCategory} />
      <CategoryBreakdown title="Income By Category" rows={incomeByCategory} />
    </div>
  );
}

function CategoryBreakdown({ rows, title }: { rows: ReportCategoryBreakdownItem[]; title: string }) {
  return (
    <SectionCard title={title} description={`${rows.length} categor${rows.length === 1 ? "y" : "ies"} in this report.`}>
      <DataTable
        columns={[
          { header: "Category", render: (item) => item.categoryName },
          { align: "right", header: "Transactions", render: (item) => item.transactionCount },
          { align: "right", header: "Total", render: (item) => <CurrencyValue value={item.totalAmount} /> },
          { align: "right", header: "Share", render: (item) => <SensitiveValue format="percent" value={item.percentage} /> }
        ]}
        emptyMessage="No category breakdown is available for this report."
        rows={rows}
      />
    </SectionCard>
  );
}

function BudgetItemsSection({ emptyMessage = "No budgets found for this period.", items, title }: { emptyMessage?: string; items?: BudgetReport["summary"]["items"]; title: string }) {
  const rows = safeArray(items);

  return (
    <SectionCard title={title} description={`${rows.length} budget item${rows.length === 1 ? "" : "s"} in this report.`}>
      <DataTable
        columns={[
          { header: "Category", render: (item) => item.category.name },
          { header: "Period", render: (item) => `${item.year}-${String(item.month).padStart(2, "0")}` },
          { align: "right", header: "Limit", render: (item) => <CurrencyValue value={item.limitAmount} /> },
          { align: "right", header: "Used", render: (item) => <CurrencyValue value={item.usedAmount} /> },
          { align: "right", header: "Remaining", render: (item) => <CurrencyValue value={item.remainingAmount} /> },
          {
            header: "Usage",
            render: (item) => (
              <div className="min-w-36">
                <ProgressIndicator label={<SensitiveValue format="percent" value={item.usagePercentage} />} tone={item.status === "OVER_BUDGET" ? "danger" : item.status === "WARNING" ? "warning" : "success"} value={capPercentage(item.usagePercentage)} />
              </div>
            )
          },
          { header: "Status", render: (item) => <StatusBadge status={item.status} /> }
        ]}
        emptyMessage={emptyMessage}
        rows={rows}
      />
    </SectionCard>
  );
}

function DebtSummarySection({ summary }: { summary?: DebtSummary }) {
  const safeSummary = getDebtSummary(summary);

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatTile helper={`${safeSummary.unpaidDebtCount} unpaid debts`} icon={CreditCard} label="Total I Owe" tone="danger" value={<CurrencyValue value={safeSummary.totalIOweRemainingAmount} />} />
      <StatTile helper={`${safeSummary.paidDebtCount} paid debts`} icon={CircleDollarSign} label="Owed To Me" tone="success" value={<CurrencyValue value={safeSummary.totalOwedToMeRemainingAmount} />} />
      <StatTile helper={`${safeSummary.partialDebtCount} partial debts`} icon={ReceiptText} label="Due Soon" tone={safeSummary.dueSoonCount > 0 ? "warning" : "blue"} value={`${safeSummary.dueSoonCount}`} />
      <StatTile helper="Unpaid or partial past due" icon={CreditCard} label="Overdue" tone={safeSummary.overdueCount > 0 ? "danger" : "primary"} value={`${safeSummary.overdueCount}`} />
    </section>
  );
}

function SavingGoalSummarySection({ summary }: { summary?: SavingGoalSummary }) {
  const safeSummary = getSavingGoalSummary(summary);

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatTile helper={`${safeSummary.activeGoalsCount} active goals`} icon={Target} label="Total Target" value={<CurrencyValue value={safeSummary.totalTargetAmount} />} />
      <StatTile helper={<SensitiveValue format="percent" value={safeSummary.averageProgressPercentage} />} icon={PiggyBank} label="Total Saved" tone="success" value={<CurrencyValue value={safeSummary.totalSavedAmount} />} />
      <StatTile helper={`${safeSummary.completedGoalsCount} completed goals`} icon={WalletCards} label="Remaining" tone="blue" value={<CurrencyValue value={safeSummary.totalRemainingAmount} />} />
      <StatTile helper={`${safeSummary.dueSoonCount} due soon`} icon={Target} label="Cancelled" tone="warning" value={`${safeSummary.cancelledGoalsCount}`} />
    </section>
  );
}

function TransactionTableSection({ rows, title }: { rows?: ReportTransaction[]; title: string }) {
  const safeRows = safeArray(rows);

  return (
    <SectionCard title={title} description={`${safeRows.length} transaction${safeRows.length === 1 ? "" : "s"} in this report.`}>
      <DataTable
        columns={[
          { header: "Date", render: (transaction) => formatMaybeDate(transaction.transactionDate) },
          { header: "Type", render: (transaction) => <StatusBadge status={transaction.type} /> },
          { header: "Purpose", render: (transaction) => transactionPurposeLabels[transaction.purpose] },
          { header: "Category", render: (transaction) => transaction.category?.name ?? "Unknown category" },
          { header: "Wallet", render: (transaction) => transaction.wallet?.name ?? "Unknown wallet" },
          { header: "Note", render: (transaction) => transaction.note ?? "-" },
          {
            align: "right",
            header: "Amount",
            render: (transaction) => (
              <span className={transaction.type === "INCOME" ? "text-emerald-700" : "text-red-600"}>
                <SensitiveValue
                  format="currency"
                  mask={transaction.type === "EXPENSE" ? "-Rp *****" : "Rp *****"}
                  value={transaction.type === "EXPENSE" ? -transaction.amount : transaction.amount}
                />
              </span>
            )
          }
        ]}
        emptyMessage="No transactions found for this report."
        rows={safeRows}
      />
    </SectionCard>
  );
}

function DataTable<T>({ columns, emptyMessage, rows }: { columns: Array<TableColumn<T>>; emptyMessage: string; rows: T[] }) {
  const safeRows = safeArray(rows);
  const pagination = useClientPagination(safeRows, [safeRows.length]);

  if (safeRows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-muted/40">
          <tr>
            {columns.map((column) => (
              <th
                key={column.header}
                className={cn("px-4 py-3 font-medium text-muted-foreground", column.align === "right" ? "text-right" : "text-left")}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {pagination.paginatedItems.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((column) => (
                <td
                  key={column.header}
                  className={cn("whitespace-nowrap px-4 py-3 text-foreground", column.align === "right" ? "text-right" : "text-left")}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <PaginationControls
        className="px-4 pb-4"
        onPageChange={pagination.setPage}
        onPageSizeChange={pagination.setPageSize}
        page={pagination.page}
        pageSize={pagination.pageSize}
        totalItems={pagination.totalItems}
        totalPages={pagination.totalPages}
      />
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-lg border border-border bg-card" />
        ))}
      </section>
      <SectionCard title="Loading report" description="Loading report data.">
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-10 animate-pulse rounded bg-muted" />
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function CurrencyValue({ value }: { value: number }) {
  return <SensitiveValue format="currency" value={value} />;
}

function formatMaybeDate(value?: string | null) {
  return value ? formatDate(value) : "-";
}

function capPercentage(value: number) {
  return Math.min(Math.max(Math.round(value), 0), 100);
}

function safeArray<T>(value: T[] | null | undefined) {
  return Array.isArray(value) ? value : [];
}

function getFinancialSummary(summary?: ReportFinancialSummary): ReportFinancialSummary {
  return {
    availableBalance: summary?.availableBalance ?? 0,
    debtCollections: summary?.debtCollections ?? 0,
    debtPayments: summary?.debtPayments ?? 0,
    expenseTransactionCount: summary?.expenseTransactionCount ?? 0,
    incomeTransactionCount: summary?.incomeTransactionCount ?? 0,
    netCashFlow: summary?.netCashFlow ?? 0,
    normalExpense: summary?.normalExpense ?? 0,
    savingContributions: summary?.savingContributions ?? 0,
    totalExpense: summary?.totalExpense ?? 0,
    totalIncome: summary?.totalIncome ?? 0,
    transactionCount: summary?.transactionCount ?? 0
  };
}

function getBudgetSummary(summary?: BudgetSummary): BudgetSummary {
  return {
    items: safeArray(summary?.items),
    month: summary?.month ?? 0,
    overBudgetCount: summary?.overBudgetCount ?? 0,
    overallUsagePercentage: summary?.overallUsagePercentage ?? 0,
    safeBudgetCount: summary?.safeBudgetCount ?? 0,
    totalLimitAmount: summary?.totalLimitAmount ?? 0,
    totalRemainingAmount: summary?.totalRemainingAmount ?? 0,
    totalUsedAmount: summary?.totalUsedAmount ?? 0,
    warningBudgetCount: summary?.warningBudgetCount ?? 0,
    year: summary?.year ?? 0
  };
}

function getDebtSummary(summary?: DebtSummary): DebtSummary {
  return {
    dueSoonCount: summary?.dueSoonCount ?? 0,
    overdueCount: summary?.overdueCount ?? 0,
    paidDebtCount: summary?.paidDebtCount ?? 0,
    partialDebtCount: summary?.partialDebtCount ?? 0,
    recentPayments: safeArray(summary?.recentPayments),
    totalIOweRemainingAmount: summary?.totalIOweRemainingAmount ?? 0,
    totalOwedToMeRemainingAmount: summary?.totalOwedToMeRemainingAmount ?? 0,
    unpaidDebtCount: summary?.unpaidDebtCount ?? 0,
    upcomingDueDebts: safeArray(summary?.upcomingDueDebts)
  };
}

function getSavingGoalSummary(summary?: SavingGoalSummary): SavingGoalSummary {
  return {
    activeGoals: safeArray(summary?.activeGoals),
    activeGoalsCount: summary?.activeGoalsCount ?? 0,
    averageProgressPercentage: summary?.averageProgressPercentage ?? 0,
    cancelledGoalsCount: summary?.cancelledGoalsCount ?? 0,
    completedGoalsCount: summary?.completedGoalsCount ?? 0,
    dueSoonCount: summary?.dueSoonCount ?? 0,
    overdueCount: summary?.overdueCount ?? 0,
    recentContributions: safeArray(summary?.recentContributions),
    totalRemainingAmount: summary?.totalRemainingAmount ?? 0,
    totalSavedAmount: summary?.totalSavedAmount ?? 0,
    totalTargetAmount: summary?.totalTargetAmount ?? 0
  };
}
