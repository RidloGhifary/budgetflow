"use client";

import { useMemo, useState } from "react";
import { Download, FileText, Loader2, RefreshCw, Send } from "lucide-react";

import { PaginationControls } from "@/components/shared/pagination";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDataExports } from "@/hooks/use-data-exports";
import { getFriendlyApiError } from "@/lib/api/http";
import { formatDateTime } from "@/lib/format";
import { transactionTypeLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";
import type { Category, DataExport, DataExportStatus, TransactionType, Wallet } from "@/types/api";

interface DataExportPanelProps {
  categories: Category[];
  isCategoriesLoading: boolean;
  isWalletsLoading: boolean;
  wallets: Wallet[];
}

const selectClassName =
  "flex h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50";

const statusLabels: Record<DataExportStatus, string> = {
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
  EXPIRED: "Expired",
  FAILED: "Failed",
  PENDING: "Pending",
  PROCESSING: "Processing"
};

export function DataExportPanel({
  categories,
  isCategoriesLoading,
  isWalletsLoading,
  wallets
}: DataExportPanelProps) {
  const { showToast } = useToast();
  const [filters, setFilters] = useState({
    categoryId: "",
    endDate: "",
    search: "",
    startDate: "",
    type: "" as TransactionType | "",
    walletId: ""
  });
  const [listFilters, setListFilters] = useState({
    page: 1,
    pageSize: 10,
    status: "" as DataExportStatus | ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const exportListFilters = useMemo(
    () => ({
      exportType: "TRANSACTIONS" as const,
      format: "CSV" as const,
      page: listFilters.page,
      pageSize: listFilters.pageSize,
      status: listFilters.status
    }),
    [listFilters.page, listFilters.pageSize, listFilters.status]
  );
  const {
    createExport,
    downloadExport,
    errorMessage,
    exports,
    isLoading,
    pagination,
    reload
  } = useDataExports(exportListFilters);
  const matchingCategories = categories.filter((category) => !filters.type || category.type === filters.type);

  const submitExport = async () => {
    if ((filters.startDate && !filters.endDate) || (!filters.startDate && filters.endDate)) {
      showToast({ title: "Check export dates", description: "Start date and end date are required together.", variant: "error" });
      return;
    }

    setIsSubmitting(true);

    try {
      await createExport({
        exportType: "TRANSACTIONS",
        format: "CSV",
        filters: {
          categoryId: filters.categoryId || undefined,
          endDate: filters.endDate || undefined,
          search: filters.search || undefined,
          startDate: filters.startDate || undefined,
          type: filters.type || undefined,
          walletId: filters.walletId || undefined
        }
      });
      showToast({ title: "Export queued", description: "BudgetFlow will process it in the background.", variant: "success" });
    } catch (error) {
      showToast({
        title: "Export was not queued",
        description: getFriendlyApiError(error, "createExport"),
        variant: "error"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = async (dataExport: DataExport) => {
    setDownloadingId(dataExport.id);

    try {
      const file = await downloadExport(dataExport.id);
      downloadFile(file);
      showToast({ title: "Export downloaded", variant: "success" });
      await reload();
    } catch (error) {
      showToast({
        title: "Download failed",
        description: getFriendlyApiError(error, "exportReport"),
        variant: "error"
      });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <SectionCard
      title="Background Data Export"
      description="Request a CSV transaction export and download it after the worker finishes processing."
    >
      <div className="min-h-[620px] space-y-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Start date</span>
            <Input
              onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))}
              type="date"
              value={filters.startDate}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">End date</span>
            <Input
              onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))}
              type="date"
              value={filters.endDate}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Type</span>
            <select
              className={selectClassName}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  categoryId: "",
                  type: event.target.value as TransactionType | ""
                }))
              }
              value={filters.type}
            >
              <option value="">All types</option>
              <option value="INCOME">{transactionTypeLabels.INCOME}</option>
              <option value="EXPENSE">{transactionTypeLabels.EXPENSE}</option>
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Wallet</span>
            <select
              className={selectClassName}
              disabled={isWalletsLoading}
              onChange={(event) => setFilters((current) => ({ ...current, walletId: event.target.value }))}
              value={filters.walletId}
            >
              <option value="">All wallets</option>
              {wallets.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {wallet.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-2 xl:col-span-2">
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Category</span>
            <select
              className={selectClassName}
              disabled={isCategoriesLoading}
              onChange={(event) => setFilters((current) => ({ ...current, categoryId: event.target.value }))}
              value={filters.categoryId}
            >
              <option value="">All categories</option>
              {matchingCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-2 xl:col-span-2">
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Search</span>
            <Input
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="Search note, wallet, or category"
              value={filters.search}
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button disabled={isSubmitting} onClick={() => void submitExport()} type="button">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Request CSV export
          </Button>
          <Button disabled={isLoading} onClick={() => void reload()} type="button" variant="outline">
            <RefreshCw className="h-4 w-4" />
            Refresh exports
          </Button>
          <select
            className={cn(selectClassName, "w-auto")}
            onChange={(event) =>
              setListFilters((current) => ({
                ...current,
                page: 1,
                status: event.target.value as DataExportStatus | ""
              }))
            }
            value={listFilters.status}
          >
            <option value="">All statuses</option>
            {Object.entries(statusLabels).map(([status, label]) => (
              <option key={status} value={status}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="min-h-96" aria-live="polite">
          {isLoading ? <ExportSkeleton /> : null}

          {!isLoading && errorMessage ? (
            <div className="min-h-96 rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              <p>{errorMessage}</p>
              <Button className="mt-3" onClick={() => void reload()} type="button" variant="outline">
                Retry
              </Button>
            </div>
          ) : null}

          {!isLoading && !errorMessage && exports.length === 0 ? (
            <div className="flex min-h-96 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 px-6 py-8 text-center">
              <FileText className="h-6 w-6 text-primary" />
              <p className="mt-3 text-sm font-semibold text-foreground">No exports requested yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">Your background exports will appear here after you request one.</p>
            </div>
          ) : null}

          {!isLoading && !errorMessage && exports.length > 0 ? (
            <div className="space-y-3">
              {exports.map((dataExport) => (
                <ExportRow
                  dataExport={dataExport}
                  downloadingId={downloadingId}
                  key={dataExport.id}
                  onDownload={() => void handleDownload(dataExport)}
                />
              ))}
              <PaginationControls
                onPageChange={(page) => setListFilters((current) => ({ ...current, page }))}
                onPageSizeChange={(pageSize) => setListFilters((current) => ({ ...current, page: 1, pageSize }))}
                page={pagination.page}
                pageSize={pagination.pageSize}
                totalItems={pagination.totalItems}
                totalPages={pagination.totalPages}
              />
            </div>
          ) : null}
        </div>
      </div>
    </SectionCard>
  );
}

function ExportRow({
  dataExport,
  downloadingId,
  onDownload
}: {
  dataExport: DataExport;
  downloadingId: string | null;
  onDownload: () => void;
}) {
  const isReady = dataExport.status === "COMPLETED";

  return (
    <article className="min-h-[116px] rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-foreground">Transactions CSV</h3>
            <StatusBadge status={dataExport.status} />
          </div>
          <div className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
            <span>Requested {formatDateTime(dataExport.requestedAt)}</span>
            <span>{dataExport.rowCount ?? 0} rows</span>
            <span>{formatFileSize(dataExport.fileSize)}</span>
            <span>Expires {dataExport.expiresAt ? formatDateTime(dataExport.expiresAt) : "Not set"}</span>
          </div>
          {dataExport.job && dataExport.status !== "COMPLETED" ? (
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${dataExport.job.progress}%` }} />
            </div>
          ) : null}
          {dataExport.errorMessage ? <p className="mt-2 text-sm text-red-700">{dataExport.errorMessage}</p> : null}
        </div>
        <Button disabled={!isReady || downloadingId === dataExport.id} onClick={onDownload} type="button">
          {downloadingId === dataExport.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Download
        </Button>
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: DataExportStatus }) {
  const variant = status === "COMPLETED" ? "success" : status === "FAILED" || status === "EXPIRED" ? "danger" : "warning";

  return <Badge variant={variant}>{statusLabels[status]}</Badge>;
}

function ExportSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div className="min-h-[116px] rounded-lg border border-border p-4" key={index}>
          <div className="h-5 w-44 animate-pulse rounded bg-muted" />
          <div className="mt-3 h-4 w-full animate-pulse rounded bg-muted" />
          <div className="mt-3 h-8 w-28 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function downloadFile(file: { blob: Blob; fileName: string | null }) {
  const url = window.URL.createObjectURL(file.blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = file.fileName ?? "budgetflow-export.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

function formatFileSize(value?: number | null) {
  if (!value) {
    return "No file yet";
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
