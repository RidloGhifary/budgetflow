"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Clock3, Eye, FilterX, History, RefreshCw, Search } from "lucide-react";

import { SensitiveValue } from "@/components/privacy/sensitive-value";
import { PageHeader } from "@/components/shared/page-header";
import { PaginationControls } from "@/components/shared/pagination";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuditLogDetail, useAuditLogs } from "@/hooks/use-audit-logs";
import type { AuditLogFilters } from "@/lib/api/audit-logs.api";
import {
  auditResultLabels,
  auditSeverityLabels,
  formatAuditAction,
  formatAuditEntity
} from "@/lib/audit-log-labels";
import { formatDateTime } from "@/lib/format";
import type { AuditLogDetail, AuditLogResult, AuditLogSeverity, AuditLogSummary } from "@/types/api";

const emptyFilters: AuditLogFilters = {
  action: "",
  endDate: "",
  entityType: "",
  page: 1,
  pageSize: 10,
  result: "",
  search: "",
  severity: "",
  startDate: ""
};

export default function ActivityPage() {
  const [filters, setFilters] = useState<AuditLogFilters>(emptyFilters);
  const { auditLogs, errorMessage, isLoading, pagination, reload } = useAuditLogs(filters);
  const [selectedAuditLogId, setSelectedAuditLogId] = useState<string | null>(null);
  const {
    auditLog: detail,
    errorMessage: detailError,
    isLoading: isDetailLoading,
    reload: reloadDetail
  } = useAuditLogDetail(selectedAuditLogId);
  const hasActiveFilters = Object.entries(filters).some(([key, value]) => key !== "page" && key !== "pageSize" && Boolean(value));

  const updateFilter = (patch: Partial<AuditLogFilters>) => {
    setFilters((current) => ({
      ...current,
      ...patch,
      page: patch.page ?? 1
    }));
  };

  const clearFilters = () => setFilters(emptyFilters);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity Log"
        description="Review important account, security, and financial changes recorded by BudgetFlow."
        actions={
          <Button disabled={isLoading} onClick={() => void reload()} type="button" variant="outline">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <SectionCard title="Filters" description="Search by action, entity, result, severity, or date range.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="block space-y-2 xl:col-span-2">
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Search</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                disabled={isLoading}
                onChange={(event) => updateFilter({ search: event.target.value })}
                placeholder="transaction.created, account, session..."
                value={filters.search ?? ""}
              />
            </div>
          </label>

          <FilterInput
            disabled={isLoading}
            label="Action"
            onChange={(value) => updateFilter({ action: value })}
            placeholder="transaction.created"
            value={filters.action ?? ""}
          />

          <FilterInput
            disabled={isLoading}
            label="Entity"
            onChange={(value) => updateFilter({ entityType: value })}
            placeholder="transaction"
            value={filters.entityType ?? ""}
          />

          <FilterSelect
            disabled={isLoading}
            label="Result"
            onChange={(value) => updateFilter({ result: value as AuditLogResult | "" })}
            value={filters.result ?? ""}
          >
            <option value="">All results</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILURE">Failure</option>
            <option value="DENIED">Denied</option>
          </FilterSelect>

          <FilterSelect
            disabled={isLoading}
            label="Severity"
            onChange={(value) => updateFilter({ severity: value as AuditLogSeverity | "" })}
            value={filters.severity ?? ""}
          >
            <option value="">All severities</option>
            <option value="INFO">Info</option>
            <option value="WARNING">Warning</option>
            <option value="CRITICAL">Critical</option>
          </FilterSelect>

          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Start</span>
            <Input disabled={isLoading} onChange={(event) => updateFilter({ startDate: event.target.value })} type="date" value={filters.startDate ?? ""} />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">End</span>
            <Input disabled={isLoading} onChange={(event) => updateFilter({ endDate: event.target.value })} type="date" value={filters.endDate ?? ""} />
          </label>
        </div>
        {hasActiveFilters ? (
          <Button className="mt-4" onClick={clearFilters} type="button" variant="outline">
            <FilterX className="h-4 w-4" />
            Clear filters
          </Button>
        ) : null}
      </SectionCard>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
        <SectionCard
          title="Audit Events"
          description={`${pagination.totalItems} event${pagination.totalItems === 1 ? "" : "s"} recorded.`}
        >
          {isLoading ? <AuditLogSkeleton /> : null}

          {!isLoading && errorMessage ? (
            <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
              <p>{errorMessage}</p>
              <Button className="mt-3" onClick={() => void reload()} type="button" variant="outline">
                Retry
              </Button>
            </div>
          ) : null}

          {!isLoading && !errorMessage && auditLogs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
              <History className="mx-auto h-6 w-6 text-primary" />
              <h2 className="mt-3 text-base font-semibold text-foreground">No activity recorded yet.</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Important changes and security events will appear here after they happen.
              </p>
            </div>
          ) : null}

          {!isLoading && !errorMessage && auditLogs.length > 0 ? (
            <div className="space-y-4">
              <div className="space-y-3">
                {auditLogs.map((auditLog) => (
                  <AuditLogRow
                    auditLog={auditLog}
                    isSelected={selectedAuditLogId === auditLog.id}
                    key={auditLog.id}
                    onSelect={() => setSelectedAuditLogId(auditLog.id)}
                  />
                ))}
              </div>
              <PaginationControls
                onPageChange={(page) => updateFilter({ page })}
                onPageSizeChange={(pageSize) => updateFilter({ pageSize })}
                page={pagination.page}
                pageSize={pagination.pageSize}
                totalItems={pagination.totalItems}
                totalPages={pagination.totalPages}
              />
            </div>
          ) : null}
        </SectionCard>

        <AuditLogDetailPanel
          auditLog={detail}
          errorMessage={detailError}
          isLoading={isDetailLoading}
          onRetry={() => void reloadDetail()}
        />
      </section>
    </div>
  );
}

function AuditLogRow({
  auditLog,
  isSelected,
  onSelect
}: {
  auditLog: AuditLogSummary;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <article className={`rounded-lg border p-4 transition-colors ${isSelected ? "border-primary bg-secondary/40" : "border-border bg-card hover:border-primary/25"}`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-foreground">{formatAuditAction(auditLog.action)}</h2>
            <ResultBadge result={auditLog.result} />
            <SeverityBadge severity={auditLog.severity} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatAuditEntity(auditLog.entityType)}
            {auditLog.entityId ? ` - ${auditLog.entityId}` : ""}
          </p>
          <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5" />
              {formatDateTime(auditLog.createdAt)}
            </span>
            <span>{getDeviceLabel(auditLog)}</span>
            <span>IP address: {auditLog.ipAddress ?? "Unknown IP"}</span>
          </div>
        </div>
        <Button onClick={onSelect} size="sm" type="button" variant="outline">
          <Eye className="h-4 w-4" />
          Details
        </Button>
      </div>
    </article>
  );
}

function AuditLogDetailPanel({
  auditLog,
  errorMessage,
  isLoading,
  onRetry
}: {
  auditLog: AuditLogDetail | null;
  errorMessage: string | null;
  isLoading: boolean;
  onRetry: () => void;
}) {
  if (!auditLog && !isLoading && !errorMessage) {
    return (
      <SectionCard title="Event Detail" description="Select an audit event to inspect request context and changed fields.">
        <p className="text-sm text-muted-foreground">Sanitized snapshots and metadata appear here when available.</p>
      </SectionCard>
    );
  }

  if (isLoading) {
    return (
      <SectionCard title="Loading detail" description="Loading audit event detail.">
        <AuditLogSkeleton compact />
      </SectionCard>
    );
  }

  if (errorMessage) {
    return (
      <SectionCard title="Could not load detail" description={errorMessage}>
        <Button onClick={onRetry} type="button">
          Retry
        </Button>
      </SectionCard>
    );
  }

  if (!auditLog) {
    return null;
  }

  return (
    <SectionCard
      title={formatAuditAction(auditLog.action)}
      description={`${formatAuditEntity(auditLog.entityType)} activity recorded ${formatDateTime(auditLog.createdAt)}.`}
    >
      <div className="space-y-5">
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <InfoTile label="Result" value={<ResultBadge result={auditLog.result} />} />
          <InfoTile label="Severity" value={<SeverityBadge severity={auditLog.severity} />} />
          <InfoTile label="Device" value={getDeviceLabel(auditLog)} />
          <InfoTile label="IP address" value={auditLog.ipAddress ?? "Unknown IP"} />
          <InfoTile label="Session" value={auditLog.sessionId ?? "Not linked"} />
          <InfoTile label="Request" value={auditLog.requestId ?? auditLog.correlationId ?? "Not provided"} />
        </div>

        {auditLog.errorMessage ? (
          <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">{auditLog.errorMessage}</div>
        ) : null}

        <SnapshotDiff beforeSnapshot={auditLog.beforeSnapshot} afterSnapshot={auditLog.afterSnapshot} />

        <MetadataBlock metadata={auditLog.metadata} />
      </div>
    </SectionCard>
  );
}

function SnapshotDiff({
  afterSnapshot,
  beforeSnapshot
}: {
  afterSnapshot?: Record<string, unknown> | null;
  beforeSnapshot?: Record<string, unknown> | null;
}) {
  const before = beforeSnapshot ?? {};
  const after = afterSnapshot ?? {};
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));

  if (keys.length === 0) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-foreground">Changes</h3>
        <p className="mt-2 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-5 text-center text-sm text-muted-foreground">
          No field-level snapshot was recorded for this event.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">Changes</h3>
      <div className="mt-3 overflow-hidden rounded-lg border border-border">
        <div className="grid grid-cols-[0.8fr_1fr_1fr] bg-muted/50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          <span>Field</span>
          <span>Before</span>
          <span>After</span>
        </div>
        <div className="divide-y divide-border">
          {keys.map((key) => (
            <div className="grid grid-cols-[0.8fr_1fr_1fr] gap-3 px-3 py-2 text-sm" key={key}>
              <span className="break-words font-medium text-foreground">{formatFieldLabel(key)}</span>
              <span className="min-w-0 break-words text-muted-foreground">{formatAuditValue(key, before[key])}</span>
              <span className="min-w-0 break-words text-foreground">{formatAuditValue(key, after[key])}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetadataBlock({ metadata }: { metadata?: Record<string, unknown> | null }) {
  const entries = Object.entries(metadata ?? {}).filter(([, value]) => value !== null && value !== undefined);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">Metadata</h3>
      <div className="mt-3 space-y-2 rounded-lg border border-border p-3 text-sm">
        {entries.map(([key, value]) => (
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between" key={key}>
            <span className="font-medium text-muted-foreground">{formatFieldLabel(key)}</span>
            <span className="min-w-0 break-words text-foreground sm:text-right">{formatAuditValue(key, value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FilterInput({
  disabled,
  label,
  onChange,
  placeholder,
  value
}: {
  disabled: boolean;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</span>
      <Input disabled={disabled} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} value={value} />
    </label>
  );
}

function FilterSelect({
  children,
  disabled,
  label,
  onChange,
  value
}: {
  children: ReactNode;
  disabled: boolean;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</span>
      <select
        className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {children}
      </select>
    </label>
  );
}

function InfoTile({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-md bg-muted/40 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 font-semibold text-foreground">{value}</div>
    </div>
  );
}

function ResultBadge({ result }: { result: AuditLogResult }) {
  const variant = result === "SUCCESS" ? "success" : result === "FAILURE" ? "danger" : "warning";

  return <Badge variant={variant}>{auditResultLabels[result]}</Badge>;
}

function SeverityBadge({ severity }: { severity: AuditLogSeverity }) {
  const variant = severity === "CRITICAL" ? "danger" : severity === "WARNING" ? "warning" : "muted";

  return <Badge variant={variant}>{auditSeverityLabels[severity]}</Badge>;
}

function AuditLogSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: compact ? 2 : 4 }).map((_, index) => (
        <div className="rounded-lg border border-border p-4" key={index}>
          <div className="h-5 w-48 animate-pulse rounded bg-muted" />
          <div className="mt-3 h-4 w-64 max-w-full animate-pulse rounded bg-muted" />
          <div className="mt-4 h-8 w-full animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function getDeviceLabel(auditLog: Pick<AuditLogSummary, "browser" | "deviceType" | "operatingSystem">) {
  const browser = auditLog.browser ?? "Unknown browser";
  const operatingSystem = auditLog.operatingSystem ?? "Unknown OS";
  const deviceType = auditLog.deviceType ?? "Unknown device";

  return `${browser} on ${operatingSystem} - ${deviceType}`;
}

function formatFieldLabel(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatAuditValue(field: string, value: unknown): ReactNode {
  if (value === null || value === undefined || value === "") {
    return "None";
  }

  if (typeof value === "number") {
    if (isFinancialField(field)) {
      return <SensitiveValue format="currency" value={value} />;
    }

    return new Intl.NumberFormat("id-ID").format(value);
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "None";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  const stringValue = String(value);

  if (isIsoDate(stringValue)) {
    return formatDateTime(stringValue);
  }

  return stringValue;
}

function isFinancialField(field: string) {
  return /(amount|balance|limit|paid|remaining|target|saved|expense|income|cashflow|cash_flow)/i.test(field);
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}T/.test(value) && !Number.isNaN(new Date(value).getTime());
}
