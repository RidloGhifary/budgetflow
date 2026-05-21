import { createCsv, type CsvColumn, type CsvValue } from "./csv.util";
import {
  getBudgetReport,
  getDebtReport,
  getMonthlyReport,
  getSavingGoalReport,
  getTransactionReport
} from "./report.service";
import type {
  BudgetExportQueryInput,
  DebtExportQueryInput,
  ExportFormat,
  MonthlyExportQueryInput,
  SavingGoalExportQueryInput,
  TransactionExportQueryInput
} from "./report.validators";
import { createXlsxWorkbook, type XlsxCellValue, type XlsxSheet } from "./xlsx.util";

const XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const CSV_CONTENT_TYPE = "text/csv; charset=utf-8";

type MonthlyReport = Awaited<ReturnType<typeof getMonthlyReport>>;
type TransactionReport = Awaited<ReturnType<typeof getTransactionReport>>;
type BudgetReport = Awaited<ReturnType<typeof getBudgetReport>>;
type DebtReport = Awaited<ReturnType<typeof getDebtReport>>;
type SavingGoalReport = Awaited<ReturnType<typeof getSavingGoalReport>>;

interface SummaryRow {
  metric: string;
  value: CsvValue;
}

export interface ExportedReportFile {
  fileName: string;
  contentType: string;
  buffer: Buffer;
}

export async function exportMonthlyReport(userId: string, input: MonthlyExportQueryInput) {
  const { format, ...query } = input;
  const report = await getMonthlyReport(userId, query);
  const fileBaseName = `budgetflow-monthly-report-${report.period.label}`;

  if (format === "csv") {
    return createCsvFile(fileBaseName, getMonthlySummaryRows(report), summaryColumns);
  }

  return createXlsxFile(fileBaseName, [
    { name: "Summary", rows: rowsFromColumns(getMonthlySummaryRows(report), summaryColumns) },
    { name: "Transactions", rows: rowsFromColumns(report.transactions, transactionColumns) },
    { name: "Expense by Category", rows: rowsFromColumns(report.expenseByCategory, categoryBreakdownColumns) },
    { name: "Income by Category", rows: rowsFromColumns(report.incomeByCategory, categoryBreakdownColumns) },
    { name: "Budgets", rows: rowsFromColumns(report.budgetSummary.items, budgetColumns) },
    { name: "Debts", rows: rowsFromColumns(report.debts, debtColumns) },
    { name: "Saving Goals", rows: rowsFromColumns(report.savingGoals, savingGoalColumns) }
  ]);
}

export async function exportTransactionReport(userId: string, input: TransactionExportQueryInput) {
  const { format, ...query } = input;
  const report = await getTransactionReport(userId, query);
  const fileBaseName = `budgetflow-transactions${getTransactionFileSuffix(query)}`;

  return createTableFile(format, fileBaseName, report.transactions, transactionColumns, "Transactions");
}

export async function exportBudgetReport(userId: string, input: BudgetExportQueryInput) {
  const { format, ...query } = input;
  const report = await getBudgetReport(userId, query);
  const fileBaseName = `budgetflow-budgets-${report.period.label}`;

  return createTableFile(format, fileBaseName, report.summary.items, budgetColumns, "Budgets");
}

export async function exportDebtReport(userId: string, input: DebtExportQueryInput) {
  const { format, ...query } = input;
  const report = await getDebtReport(userId, query);

  return createTableFile(format, "budgetflow-debts", report.debts, debtColumns, "Debts");
}

export async function exportSavingGoalReport(userId: string, input: SavingGoalExportQueryInput) {
  const { format, ...query } = input;
  const report = await getSavingGoalReport(userId, query);

  return createTableFile(format, "budgetflow-saving-goals", report.goals, savingGoalColumns, "Saving Goals");
}

function createTableFile<T>(
  format: ExportFormat,
  fileBaseName: string,
  rows: T[],
  columns: Array<CsvColumn<T>>,
  sheetName: string
): ExportedReportFile {
  if (format === "csv") {
    return createCsvFile(fileBaseName, rows, columns);
  }

  return createXlsxFile(fileBaseName, [{ name: sheetName, rows: rowsFromColumns(rows, columns) }]);
}

function createCsvFile<T>(fileBaseName: string, rows: T[], columns: Array<CsvColumn<T>>): ExportedReportFile {
  return {
    fileName: `${fileBaseName}.csv`,
    contentType: CSV_CONTENT_TYPE,
    buffer: Buffer.from(`\uFEFF${createCsv(rows, columns)}`, "utf8")
  };
}

function createXlsxFile(fileBaseName: string, sheets: XlsxSheet[]): ExportedReportFile {
  return {
    fileName: `${fileBaseName}.xlsx`,
    contentType: XLSX_CONTENT_TYPE,
    buffer: createXlsxWorkbook(sheets)
  };
}

function rowsFromColumns<T>(rows: T[], columns: Array<CsvColumn<T>>): XlsxCellValue[][] {
  return [
    columns.map((column) => column.header),
    ...rows.map((row) => columns.map((column) => column.value(row)))
  ];
}

function getMonthlySummaryRows(report: MonthlyReport): SummaryRow[] {
  return [
    { metric: "Period", value: report.period.label },
    { metric: "Start Date", value: dateOnly(report.period.startDate) },
    { metric: "End Date (Exclusive)", value: dateOnly(report.period.endDate) },
    { metric: "Total Income", value: report.financialSummary.totalIncome },
    { metric: "Total Expense", value: report.financialSummary.totalExpense },
    { metric: "Normal Expense", value: report.financialSummary.normalExpense },
    { metric: "Debt Payments", value: report.financialSummary.debtPayments },
    { metric: "Debt Collections", value: report.financialSummary.debtCollections },
    { metric: "Saving Contributions", value: report.financialSummary.savingContributions },
    { metric: "Net Cash Flow", value: report.financialSummary.netCashFlow },
    { metric: "Available Wallet Balance", value: report.financialSummary.availableBalance },
    { metric: "Transaction Count", value: report.financialSummary.transactionCount },
    { metric: "Income Transaction Count", value: report.financialSummary.incomeTransactionCount },
    { metric: "Expense Transaction Count", value: report.financialSummary.expenseTransactionCount },
    { metric: "Budget Limit Amount", value: report.budgetSummary.totalLimitAmount },
    { metric: "Budget Used Amount", value: report.budgetSummary.totalUsedAmount },
    { metric: "Budget Remaining Amount", value: report.budgetSummary.totalRemainingAmount },
    { metric: "Debt I Owe Remaining", value: report.debtSummary.totalIOweRemainingAmount },
    { metric: "Debt Owed To Me Remaining", value: report.debtSummary.totalOwedToMeRemainingAmount },
    { metric: "Saving Goal Target Amount", value: report.savingGoalSummary.totalTargetAmount },
    { metric: "Saving Goal Saved Amount", value: report.savingGoalSummary.totalSavedAmount },
    { metric: "Saving Goal Remaining Amount", value: report.savingGoalSummary.totalRemainingAmount },
    { metric: "Period Debt Payment Count", value: report.periodDebtPayments.paymentCount },
    { metric: "Period Debt Payment Amount", value: report.periodDebtPayments.totalAmount },
    { metric: "Period Saving Contribution Count", value: report.periodSavingContributions.contributionCount },
    { metric: "Period Saving Contribution Amount", value: report.periodSavingContributions.totalAmount }
  ];
}

const summaryColumns: Array<CsvColumn<SummaryRow>> = [
  { header: "Metric", value: (row) => row.metric },
  { header: "Value", value: (row) => row.value }
];

const transactionColumns: Array<CsvColumn<TransactionReport["transactions"][number]>> = [
  { header: "Date", value: (transaction) => dateOnly(transaction.transactionDate) },
  { header: "Type", value: (transaction) => transaction.type },
  { header: "Purpose", value: (transaction) => transaction.purpose },
  { header: "Category", value: (transaction) => transaction.category.name },
  { header: "Wallet", value: (transaction) => transaction.wallet.name },
  { header: "Note", value: (transaction) => transaction.note },
  { header: "Amount", value: (transaction) => transaction.amount }
];

const categoryBreakdownColumns: Array<CsvColumn<MonthlyReport["expenseByCategory"][number]>> = [
  { header: "Category", value: (item) => item.categoryName },
  { header: "Category Type", value: (item) => item.categoryType },
  { header: "Transaction Count", value: (item) => item.transactionCount },
  { header: "Total Amount", value: (item) => item.totalAmount },
  { header: "Percentage", value: (item) => item.percentage }
];

const budgetColumns: Array<CsvColumn<BudgetReport["summary"]["items"][number]>> = [
  { header: "Category", value: (budget) => budget.category.name },
  { header: "Month", value: (budget) => budget.month },
  { header: "Year", value: (budget) => budget.year },
  { header: "Limit Amount", value: (budget) => budget.limitAmount },
  { header: "Used Amount", value: (budget) => budget.usedAmount },
  { header: "Remaining Amount", value: (budget) => budget.remainingAmount },
  { header: "Usage Percentage", value: (budget) => budget.usagePercentage },
  { header: "Status", value: (budget) => budget.status },
  { header: "Over Amount", value: (budget) => budget.overAmount }
];

const debtColumns: Array<CsvColumn<DebtReport["debts"][number]>> = [
  { header: "Type", value: (debt) => debt.type },
  { header: "Title", value: (debt) => debt.title },
  { header: "Person Name", value: (debt) => debt.personName },
  { header: "Total Amount", value: (debt) => debt.totalAmount },
  { header: "Paid Amount", value: (debt) => debt.paidAmount },
  { header: "Remaining Amount", value: (debt) => debt.remainingAmount },
  { header: "Due Date", value: (debt) => dateOnly(debt.dueDate) },
  { header: "Status", value: (debt) => debt.status },
  { header: "Note", value: (debt) => debt.note },
  { header: "Payment Count", value: (debt) => ("paymentCount" in debt ? debt.paymentCount : 0) }
];

const savingGoalColumns: Array<CsvColumn<SavingGoalReport["goals"][number]>> = [
  { header: "Goal Name", value: (goal) => goal.name },
  { header: "Target Amount", value: (goal) => goal.targetAmount },
  { header: "Current Amount", value: (goal) => goal.currentAmount },
  { header: "Remaining Amount", value: (goal) => goal.remainingAmount },
  { header: "Progress Percentage", value: (goal) => goal.progressPercentage },
  { header: "Deadline", value: (goal) => dateOnly(goal.deadline) },
  { header: "Status", value: (goal) => goal.status },
  { header: "Note", value: (goal) => goal.note },
  { header: "Contribution Count", value: (goal) => ("contributionCount" in goal ? goal.contributionCount : 0) }
];

function getTransactionFileSuffix(query: Omit<TransactionExportQueryInput, "format">) {
  if (query.month && query.year) {
    return `-${query.year}-${String(query.month).padStart(2, "0")}`;
  }

  if (query.startDate || query.endDate) {
    return `-${query.startDate ? dateOnly(query.startDate) : "start"}-to-${query.endDate ? dateOnly(query.endDate) : "end"}`;
  }

  if (query.year) {
    return `-${query.year}`;
  }

  return "";
}

function dateOnly(value?: Date | string | null) {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}
