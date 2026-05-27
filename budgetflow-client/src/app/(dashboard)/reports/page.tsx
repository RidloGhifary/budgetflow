"use client";

import { useMemo, useState } from "react";
import { Download, FileSpreadsheet, RefreshCw } from "lucide-react";

import { DataExportPanel } from "@/components/reports/data-export-panel";
import { ReportFilters } from "@/components/reports/report-filters";
import { ReportPreview } from "@/components/reports/report-preview";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { useCategories } from "@/hooks/use-categories";
import { type ReportFilterState, useReportData } from "@/hooks/use-reports";
import { useWallets } from "@/hooks/use-wallets";
import { reportsApi, type ReportDownload } from "@/lib/api/reports.api";
import { getFriendlyApiError } from "@/lib/api/http";
import { cn } from "@/lib/utils";
import { getReportValidationMessage } from "@/lib/validation/reports";
import { useToast } from "@/providers/toast-provider";
import type { ExportFormat, ReportType } from "@/types/api";

const reportTypeOptions: Array<{ label: string; value: ReportType }> = [
  { label: "Monthly Summary", value: "monthly" },
  { label: "Custom Date Range", value: "range" },
  { label: "Transactions", value: "transactions" },
  { label: "Budgets", value: "budgets" },
  { label: "Debts", value: "debts" },
  { label: "Saving Goals", value: "goals" }
];

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>("monthly");
  const [filters, setFilters] = useState<ReportFilterState>(() => createDefaultFilters());
  const [downloadingFormat, setDownloadingFormat] = useState<ExportFormat | null>(null);
  const { categories, errorMessage: categoryError, isLoading: isCategoriesLoading } = useCategories();
  const { errorMessage: walletError, isLoading: isWalletsLoading, wallets } = useWallets();
  const { showToast } = useToast();
  const validationMessage = useMemo(() => getReportValidationMessage(reportType, filters), [filters, reportType]);
  const { errorMessage, isLoading, reload, report } = useReportData(reportType, filters, !validationMessage);
  const isExporting = downloadingFormat !== null;
  const canExport = reportType !== "range";

  const handleExport = async (format: ExportFormat) => {
    const message = getReportValidationMessage(reportType, filters);

    if (message) {
      showToast({ title: "Check report filters", description: message, variant: "error" });
      return;
    }

    setDownloadingFormat(format);

    try {
      const file = await exportActiveReport(reportType, filters, format);
      downloadReportFile(file);
      showToast({ title: `${format.toUpperCase()} export downloaded`, variant: "success" });
    } catch (error) {
      showToast({
        title: "Export failed",
        description: getFriendlyApiError(error, "exportReport"),
        variant: "error"
      });
    } finally {
      setDownloadingFormat(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Preview financial reports and download XLSX or CSV files."
        actions={
          <>
            <Button disabled={isLoading} onClick={() => void reload()} type="button" variant="outline">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button disabled={isExporting || Boolean(validationMessage) || !canExport} onClick={() => void handleExport("xlsx")} type="button" variant="outline">
              <FileSpreadsheet className="h-4 w-4" />
              {downloadingFormat === "xlsx" ? "Exporting..." : "Export XLSX"}
            </Button>
            <Button disabled={isExporting || Boolean(validationMessage) || !canExport} onClick={() => void handleExport("csv")} type="button" variant="outline">
              <Download className="h-4 w-4" />
              {downloadingFormat === "csv" ? "Exporting..." : "Export CSV"}
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-card p-2 shadow-soft">
        {reportTypeOptions.map((option) => (
          <button
            key={option.value}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              reportType === option.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-primary"
            )}
            disabled={isLoading || isExporting}
            onClick={() => setReportType(option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>

      <ReportFilters
        categories={categories}
        categoryError={categoryError}
        filters={filters}
        isCategoriesLoading={isCategoriesLoading}
        isWalletsLoading={isWalletsLoading}
        onChange={setFilters}
        reportType={reportType}
        walletError={walletError}
        wallets={wallets}
      />

      {!canExport ? (
        <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Custom date range preview is available. Exports are available for monthly, transactions, budgets, debts, and saving goals.
        </div>
      ) : null}

      <ReportPreview
        errorMessage={errorMessage}
        isLoading={isLoading}
        onRetry={() => void reload()}
        report={report}
        reportType={reportType}
        validationMessage={validationMessage}
      />

      <DataExportPanel
        categories={categories}
        isCategoriesLoading={isCategoriesLoading}
        isWalletsLoading={isWalletsLoading}
        wallets={wallets}
      />
    </div>
  );
}

function createDefaultFilters(): ReportFilterState {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const today = toDateInputValue(now);

  return {
    monthly: { month, year },
    range: { startDate, endDate: today },
    transactions: { month, year },
    budgets: { month, year },
    debts: {},
    goals: {}
  };
}

function exportActiveReport(reportType: ReportType, filters: ReportFilterState, format: ExportFormat) {
  switch (reportType) {
    case "monthly":
      return reportsApi.exportMonthly(filters.monthly, format);
    case "range":
      return Promise.reject(new Error("Custom date range export is not available yet."));
    case "transactions":
      return reportsApi.exportTransactions(filters.transactions, format);
    case "budgets":
      return reportsApi.exportBudgets(filters.budgets, format);
    case "debts":
      return reportsApi.exportDebts(filters.debts, format);
    case "goals":
      return reportsApi.exportGoals(filters.goals, format);
  }
}

function downloadReportFile(file: ReportDownload) {
  const url = window.URL.createObjectURL(file.blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = file.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}
