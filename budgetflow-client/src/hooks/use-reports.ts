"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  reportsApi,
  type BudgetReportFilters,
  type DebtReportFilters,
  type MonthlyReportFilters,
  type RangeReportFilters,
  type SavingGoalReportFilters,
  type TransactionReportFilters
} from "@/lib/api/reports.api";
import { getFriendlyApiError } from "@/lib/api/http";
import type { BudgetReport, DebtReport, MonthlyReport, RangeReport, ReportType, SavingGoalReport, TransactionReport } from "@/types/api";

export type ReportData = MonthlyReport | RangeReport | TransactionReport | BudgetReport | DebtReport | SavingGoalReport;

export interface ReportFilterState {
  budgets: BudgetReportFilters;
  debts: DebtReportFilters;
  goals: SavingGoalReportFilters;
  monthly: MonthlyReportFilters;
  range: RangeReportFilters;
  transactions: TransactionReportFilters;
}

export function getFiltersForReportType(reportType: ReportType, filters: ReportFilterState) {
  switch (reportType) {
    case "monthly":
      return filters.monthly;
    case "range":
      return filters.range;
    case "transactions":
      return filters.transactions;
    case "budgets":
      return filters.budgets;
    case "debts":
      return filters.debts;
    case "goals":
      return filters.goals;
  }
}

export function useReportData(reportType: ReportType, filters: ReportFilterState, enabled: boolean) {
  const [report, setReport] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const filterKey = useMemo(() => JSON.stringify(getFiltersForReportType(reportType, filters)), [filters, reportType]);
  const [activeFilterKey, setActiveFilterKey] = useState<string | null>(enabled ? filterKey : null);

  const loadReport = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false);
      setActiveFilterKey(null);
      setErrorMessage(null);
      return;
    }

    setActiveFilterKey(filterKey);
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const nextReport = await fetchReport(reportType, filters);
      setReport(nextReport);
    } catch (error) {
      setErrorMessage(getFriendlyApiError(error, "loadReport"));
    } finally {
      setIsLoading(false);
    }
  }, [enabled, filterKey, filters, reportType]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  return {
    report,
    isLoading: isLoading || (enabled && activeFilterKey !== filterKey),
    errorMessage,
    reload: loadReport
  };
}

async function fetchReport(reportType: ReportType, filters: ReportFilterState): Promise<ReportData> {
  switch (reportType) {
    case "monthly": {
      const response = await reportsApi.monthly(filters.monthly);
      return response.data.report;
    }
    case "range": {
      const response = await reportsApi.range(filters.range);
      return response.data.report;
    }
    case "transactions": {
      const response = await reportsApi.transactions(filters.transactions);
      return response.data.report;
    }
    case "budgets": {
      const response = await reportsApi.budgets(filters.budgets);
      return response.data.report;
    }
    case "debts": {
      const response = await reportsApi.debts(filters.debts);
      return response.data.report;
    }
    case "goals": {
      const response = await reportsApi.goals(filters.goals);
      return response.data.report;
    }
  }
}
