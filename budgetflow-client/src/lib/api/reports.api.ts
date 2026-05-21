import { apiFileRequest, apiRequest } from "@/lib/api/http";
import type {
  ApiEnvelope,
  BudgetReport,
  DebtReport,
  ExportFormat,
  MonthlyReport,
  RangeReport,
  ReportType,
  SavingGoalReport,
  TransactionReport
} from "@/types/api";

export interface MonthlyReportFilters {
  month?: number;
  year?: number;
}

export interface RangeReportFilters {
  startDate: string;
  endDate: string;
}

export interface TransactionReportFilters {
  type?: "INCOME" | "EXPENSE" | "";
  purpose?: "NORMAL" | "DEBT_PAYMENT" | "DEBT_COLLECTION" | "SAVING_CONTRIBUTION" | "";
  walletId?: string;
  categoryId?: string;
  month?: number | "";
  year?: number | "";
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface BudgetReportFilters {
  month?: number;
  year?: number;
}

export interface DebtReportFilters {
  type?: "I_OWE" | "OWED_TO_ME" | "";
  status?: "UNPAID" | "PARTIAL" | "PAID" | "";
  dueBefore?: string;
  dueAfter?: string;
  search?: string;
}

export interface SavingGoalReportFilters {
  status?: "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "";
  deadlineBefore?: string;
  deadlineAfter?: string;
  search?: string;
}

export type ReportFilters =
  | MonthlyReportFilters
  | RangeReportFilters
  | TransactionReportFilters
  | BudgetReportFilters
  | DebtReportFilters
  | SavingGoalReportFilters;

export interface ReportDownload {
  blob: Blob;
  fileName: string;
  contentType: string;
}

const fallbackFileNameByReportType: Record<ReportType, string> = {
  monthly: "budgetflow-monthly-report",
  range: "budgetflow-range-report",
  transactions: "budgetflow-transactions",
  budgets: "budgetflow-budgets",
  debts: "budgetflow-debts",
  goals: "budgetflow-saving-goals"
};

function buildQueryString(filters: object) {
  const params = new URLSearchParams();

  Object.entries(filters as Record<string, unknown>).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });

  const queryString = params.toString();

  return queryString ? `?${queryString}` : "";
}

async function exportReport(path: string, reportType: ReportType, format: ExportFormat, filters: object) {
  const response = await apiFileRequest(`${path}${buildQueryString({ ...filters, format })}`);

  return {
    blob: response.blob,
    contentType: response.contentType,
    fileName: response.fileName ?? `${fallbackFileNameByReportType[reportType]}.${format}`
  };
}

export const reportsApi = {
  monthly(filters: MonthlyReportFilters) {
    return apiRequest<ApiEnvelope<{ report: MonthlyReport }>>(`/reports/monthly${buildQueryString(filters)}`);
  },

  range(filters: RangeReportFilters) {
    return apiRequest<ApiEnvelope<{ report: RangeReport }>>(`/reports/range${buildQueryString(filters)}`);
  },

  transactions(filters: TransactionReportFilters) {
    return apiRequest<ApiEnvelope<{ report: TransactionReport }>>(`/reports/transactions${buildQueryString(filters)}`);
  },

  budgets(filters: BudgetReportFilters) {
    return apiRequest<ApiEnvelope<{ report: BudgetReport }>>(`/reports/budgets${buildQueryString(filters)}`);
  },

  debts(filters: DebtReportFilters) {
    return apiRequest<ApiEnvelope<{ report: DebtReport }>>(`/reports/debts${buildQueryString(filters)}`);
  },

  goals(filters: SavingGoalReportFilters) {
    return apiRequest<ApiEnvelope<{ report: SavingGoalReport }>>(`/reports/goals${buildQueryString(filters)}`);
  },

  exportMonthly(filters: MonthlyReportFilters, format: ExportFormat) {
    return exportReport("/reports/monthly/export", "monthly", format, filters);
  },

  exportTransactions(filters: TransactionReportFilters, format: ExportFormat) {
    return exportReport("/reports/transactions/export", "transactions", format, filters);
  },

  exportBudgets(filters: BudgetReportFilters, format: ExportFormat) {
    return exportReport("/reports/budgets/export", "budgets", format, filters);
  },

  exportDebts(filters: DebtReportFilters, format: ExportFormat) {
    return exportReport("/reports/debts/export", "debts", format, filters);
  },

  exportGoals(filters: SavingGoalReportFilters, format: ExportFormat) {
    return exportReport("/reports/goals/export", "goals", format, filters);
  }
};
