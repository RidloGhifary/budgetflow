"use client";

import { useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Loader2, RefreshCw, Upload } from "lucide-react";

import { SensitiveValue } from "@/components/privacy/sensitive-value";
import { PaginationControls } from "@/components/shared/pagination";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDataImports } from "@/hooks/use-data-imports";
import { getFriendlyApiError } from "@/lib/api/http";
import { formatDate } from "@/lib/format";
import { useToast } from "@/providers/toast-provider";
import type { DataImport, DataImportRow, DataImportRowStatus, DataImportStatus } from "@/types/api";

const rowStatusOptions: Array<{ label: string; value: DataImportRowStatus | "" }> = [
  { label: "All rows", value: "" },
  { label: "Valid", value: "VALID" },
  { label: "Invalid", value: "INVALID" },
  { label: "Duplicate", value: "DUPLICATE" },
  { label: "Imported", value: "IMPORTED" },
  { label: "Skipped", value: "SKIPPED" },
  { label: "Failed", value: "FAILED" }
];

export function TransactionImportPanel() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [includeDuplicates, setIncludeDuplicates] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const { showToast } = useToast();
  const {
    cancelImport,
    confirmImport,
    errorMessage,
    imports,
    importsPagination,
    isLoadingImports,
    isLoadingRows,
    loadImports,
    rowStatus,
    rows,
    rowsPage,
    rowsPagination,
    selectedImport,
    selectedProgress,
    selectImport,
    setImportsPage,
    setImportsPageSize,
    setRowStatus,
    setRowsPage,
    setRowsPageSize,
    uploadImport
  } = useDataImports();

  const importableRows = useMemo(() => {
    if (!selectedImport) {
      return 0;
    }

    return selectedImport.validRows + (includeDuplicates ? selectedImport.duplicateRows : 0);
  }, [includeDuplicates, selectedImport]);

  const handleUpload = async () => {
    if (!selectedFile) {
      showToast({ title: "Choose a file first", variant: "error" });
      return;
    }

    setIsUploading(true);

    try {
      const dataImport = await uploadImport(selectedFile);
      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      showToast({
        title: "Import preview ready",
        description: dataImport ? `${dataImport.validRows} rows are ready to import.` : undefined,
        variant: "success"
      });
    } catch (error) {
      showToast({
        title: "Import upload failed",
        description: getFriendlyApiError(error, "uploadImport"),
        variant: "error"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedImport) {
      return;
    }

    const confirmed = window.confirm(
      `Import ${importableRows} transaction${importableRows === 1 ? "" : "s"}? Wallet balances and reports will update.`
    );

    if (!confirmed) {
      return;
    }

    setIsConfirming(true);

    try {
      await confirmImport(selectedImport.id, includeDuplicates);
      showToast({ title: "Import queued", description: "BudgetFlow is processing the valid rows.", variant: "success" });
    } catch (error) {
      showToast({
        title: "Import was not started",
        description: getFriendlyApiError(error, "confirmImport"),
        variant: "error"
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancel = async () => {
    if (!selectedImport) {
      return;
    }

    const confirmed = window.confirm("Cancel this import? Parsed rows will remain in history but no transactions will be created.");

    if (!confirmed) {
      return;
    }

    setIsCancelling(true);

    try {
      await cancelImport(selectedImport.id);
      showToast({ title: "Import cancelled", variant: "success" });
    } catch (error) {
      showToast({
        title: "Import was not cancelled",
        description: getFriendlyApiError(error, "cancelImport"),
        variant: "error"
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const downloadTemplate = () => {
    const csv = "date,type,amount,wallet,category,description,note\n2026-05-24,expense,50000,BCA,Food,Lunch,\n2026-05-25,income,8000000,BCA,Salary,Monthly salary,\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "budgetflow-transaction-import-template.csv";
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <SectionCard
        title="Upload transaction import"
        description="Upload a CSV file, review row-level validation, then confirm the rows you want to import."
        action={
          <Button onClick={downloadTemplate} type="button" variant="outline">
            <Download className="h-4 w-4" />
            Template
          </Button>
        }
      >
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">CSV file</span>
            <input
              ref={fileInputRef}
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="block w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-secondary-foreground"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              type="file"
            />
            <p className="text-xs text-muted-foreground">
              CSV is supported up to 5MB. XLSX is detected and rejected clearly until workbook import support is added.
            </p>
          </label>
          <Button disabled={!selectedFile || isUploading} onClick={() => void handleUpload()} type="button">
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload
          </Button>
        </div>
      </SectionCard>

      {errorMessage ? (
        <SectionCard title="Could not load imports" description={errorMessage}>
          <Button onClick={() => void loadImports()} type="button">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </SectionCard>
      ) : null}

      {selectedImport ? (
        <SectionCard
          title="Import preview"
          description={`${selectedImport.originalFileName} - ${formatFileSize(selectedImport.fileSize)}`}
          action={<ImportStatusBadge status={selectedImport.status} />}
        >
          <div className="space-y-5">
            <ImportSummary dataImport={selectedImport} progress={selectedProgress} />

            {selectedImport.status === "AWAITING_CONFIRMATION" ? (
              <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    checked={includeDuplicates}
                    className="h-4 w-4 rounded border-border"
                    onChange={(event) => setIncludeDuplicates(event.target.checked)}
                    type="checkbox"
                  />
                  Include possible duplicates
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button disabled={isCancelling} onClick={() => void handleCancel()} type="button" variant="outline">
                    Cancel
                  </Button>
                  <Button disabled={isConfirming || importableRows === 0} onClick={() => void handleConfirm()} type="button">
                    {isConfirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Import valid rows
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Rows</span>
                <select
                  className="h-9 rounded-md border border-input bg-card px-2 text-sm text-foreground outline-none"
                  onChange={(event) => setRowStatus(event.target.value as DataImportRowStatus | "")}
                  value={rowStatus}
                >
                  {rowStatusOptions.map((option) => (
                    <option key={option.value || "ALL"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <ImportRowsTable isLoading={isLoadingRows} rows={rows} />
            <PaginationControls
              onPageChange={setRowsPage}
              onPageSizeChange={setRowsPageSize}
              page={rowsPage}
              pageSize={rowsPagination.pageSize}
              totalItems={rowsPagination.totalItems}
              totalPages={rowsPagination.totalPages}
            />
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title="Import history" description="Review previous uploads and processing results.">
        {isLoadingImports ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading imports...
          </div>
        ) : imports.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">No imports yet.</div>
        ) : (
          <div className="space-y-3">
            {imports.map((dataImport) => (
              <button
                key={dataImport.id}
                className="flex w-full flex-col gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 sm:flex-row sm:items-center sm:justify-between"
                onClick={() => selectImport(dataImport)}
                type="button"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-primary" />
                    <span className="font-medium text-foreground">{dataImport.originalFileName}</span>
                    <ImportStatusBadge status={dataImport.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(dataImport.createdAt)} - {dataImport.importedRows} imported, {dataImport.invalidRows + dataImport.failedRows + dataImport.skippedRows} issues
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">{dataImport.totalRows} rows</span>
              </button>
            ))}
            <PaginationControls
              onPageChange={setImportsPage}
              onPageSizeChange={setImportsPageSize}
              page={importsPagination.page}
              pageSize={importsPagination.pageSize}
              totalItems={importsPagination.totalItems}
              totalPages={importsPagination.totalPages}
            />
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function ImportSummary({ dataImport, progress }: { dataImport: DataImport; progress: number }) {
  const items = [
    { label: "Total", value: dataImport.totalRows },
    { label: "Valid", value: dataImport.validRows },
    { label: "Invalid", value: dataImport.invalidRows },
    { label: "Duplicates", value: dataImport.duplicateRows },
    { label: "Imported", value: dataImport.importedRows },
    { label: "Skipped/failed", value: dataImport.skippedRows + dataImport.failedRows }
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {items.map((item) => (
          <div key={item.label} className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="text-lg font-semibold text-foreground">{item.value}</p>
          </div>
        ))}
      </div>
      {dataImport.status === "PROCESSING" ? (
        <div className="space-y-2">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(5, progress)}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">Processing import... {progress}%</p>
        </div>
      ) : null}
      {dataImport.errorMessage ? (
        <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {dataImport.errorMessage}
        </div>
      ) : null}
    </div>
  );
}

function ImportRowsTable({ isLoading, rows }: { isLoading: boolean; rows: DataImportRow[] }) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border p-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading preview rows...
      </div>
    );
  }

  if (rows.length === 0) {
    return <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">No rows match this filter.</div>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-normal text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Row</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Wallet</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Issue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {rows.map((row) => {
              const normalized = row.normalizedData ?? {};
              const amount = typeof normalized.amount === "number" ? normalized.amount : null;

              return (
                <tr key={row.id}>
                  <td className="px-4 py-3 text-muted-foreground">{row.rowNumber}</td>
                  <td className="px-4 py-3">{getString(normalized.transactionDate)?.slice(0, 10) ?? "-"}</td>
                  <td className="px-4 py-3">{getString(normalized.type) ?? "-"}</td>
                  <td className="px-4 py-3">{amount === null ? "-" : <SensitiveValue format="currency" value={amount} />}</td>
                  <td className="px-4 py-3">{getString(normalized.walletName) ?? "-"}</td>
                  <td className="px-4 py-3">{getString(normalized.categoryName) ?? "-"}</td>
                  <td className="px-4 py-3"><RowStatusBadge status={row.validationStatus} /></td>
                  <td className="max-w-[280px] px-4 py-3 text-xs text-muted-foreground">
                    {formatRowIssues(row)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ImportStatusBadge({ status }: { status: DataImportStatus }) {
  const config: Record<DataImportStatus, { label: string; variant: "default" | "success" | "warning" | "danger" | "muted" }> = {
    AWAITING_CONFIRMATION: { label: "Awaiting confirmation", variant: "warning" },
    CANCELLED: { label: "Cancelled", variant: "muted" },
    COMPLETED: { label: "Completed", variant: "success" },
    COMPLETED_WITH_ERRORS: { label: "Completed with issues", variant: "warning" },
    FAILED: { label: "Failed", variant: "danger" },
    PARSING: { label: "Parsing", variant: "default" },
    PROCESSING: { label: "Processing", variant: "default" },
    UPLOADED: { label: "Uploaded", variant: "default" }
  };

  return <Badge variant={config[status].variant}>{config[status].label}</Badge>;
}

function RowStatusBadge({ status }: { status: DataImportRowStatus }) {
  const config: Record<DataImportRowStatus, { label: string; variant: "default" | "success" | "warning" | "danger" | "muted" }> = {
    DUPLICATE: { label: "Duplicate", variant: "warning" },
    FAILED: { label: "Failed", variant: "danger" },
    IMPORTED: { label: "Imported", variant: "success" },
    INVALID: { label: "Invalid", variant: "danger" },
    SKIPPED: { label: "Skipped", variant: "muted" },
    VALID: { label: "Valid", variant: "success" }
  };

  return <Badge variant={config[status].variant}>{config[status].label}</Badge>;
}

function formatRowIssues(row: DataImportRow) {
  if (row.skippedReason) {
    return row.skippedReason;
  }

  if (Array.isArray(row.validationErrors) && row.validationErrors.length > 0) {
    return row.validationErrors.filter((error) => typeof error === "string").join(" ");
  }

  return "-";
}

function getString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function formatFileSize(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}
