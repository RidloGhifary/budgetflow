"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Archive, Bell, Check, CheckCheck, FilterX, Loader2, RefreshCw, Search } from "lucide-react";
import { useRouter } from "next/navigation";

import { SensitiveText, SensitiveValue } from "@/components/privacy/sensitive-value";
import { PageHeader } from "@/components/shared/page-header";
import { PaginationControls } from "@/components/shared/pagination";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNotifications } from "@/hooks/use-notifications";
import { getFriendlyApiError } from "@/lib/api/http";
import type { NotificationFilters } from "@/lib/api/notifications.api";
import { formatDateTime, formatRelativeTime } from "@/lib/format";
import {
  formatNotificationEntity,
  formatNotificationType,
  notificationCategoryLabels,
  notificationSeverityLabels,
  notificationStatusLabels
} from "@/lib/notification-labels";
import { cn } from "@/lib/utils";
import { useNotificationsCenter } from "@/providers/notifications-provider";
import { useToast } from "@/providers/toast-provider";
import type { Notification, NotificationCategory, NotificationSeverity, NotificationStatus } from "@/types/api";

const emptyFilters: NotificationFilters = {
  category: "",
  endDate: "",
  page: 1,
  pageSize: 10,
  search: "",
  severity: "",
  startDate: "",
  status: "",
  type: ""
};

const categoryOptions: NotificationCategory[] = [
  "BUDGET",
  "FINANCE",
  "PRIVACY",
  "RECURRING_TRANSACTION",
  "SECURITY",
  "SYSTEM",
  "TRANSACTION"
];

const severityOptions: NotificationSeverity[] = ["INFO", "SUCCESS", "WARNING", "CRITICAL"];
const statusOptions: NotificationStatus[] = ["UNREAD", "READ", "ARCHIVED"];

export default function NotificationsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { refreshRecentNotifications, refreshUnreadCount } = useNotificationsCenter();
  const [filters, setFilters] = useState<NotificationFilters>(emptyFilters);
  const {
    archiveNotification,
    errorMessage,
    isLoading,
    isMutating,
    markAllNotificationsRead,
    markNotificationRead,
    notifications,
    pagination,
    reload
  } = useNotifications(filters);
  const hasActiveFilters = Object.entries(filters).some(([key, value]) => key !== "page" && key !== "pageSize" && Boolean(value));

  const updateFilter = (patch: Partial<NotificationFilters>) => {
    setFilters((current) => ({
      ...current,
      ...patch,
      page: patch.page ?? 1
    }));
  };

  const syncNotificationHeader = async () => {
    await Promise.all([refreshUnreadCount(), refreshRecentNotifications()]);
  };

  const handleMarkRead = async (notification: Notification) => {
    if (notification.status !== "UNREAD") {
      return;
    }

    try {
      await markNotificationRead(notification.id);
      await syncNotificationHeader();
    } catch (error) {
      showToast({
        title: "Notification not updated",
        description: getFriendlyApiError(error, "updateNotification"),
        variant: "error"
      });
    }
  };

  const handleOpenNotification = async (notification: Notification) => {
    await handleMarkRead(notification);

    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const updatedCount = await markAllNotificationsRead();
      await syncNotificationHeader();
      showToast({
        title: "Notifications updated",
        description: updatedCount > 0 ? "All notifications are marked as read." : "There were no unread notifications.",
        variant: "success"
      });
    } catch (error) {
      showToast({
        title: "Notifications not updated",
        description: getFriendlyApiError(error, "updateNotification"),
        variant: "error"
      });
    }
  };

  const handleArchive = async (notification: Notification) => {
    try {
      await archiveNotification(notification.id);
      await syncNotificationHeader();
      showToast({ title: "Notification archived", variant: "success" });
    } catch (error) {
      showToast({
        title: "Notification not archived",
        description: getFriendlyApiError(error, "updateNotification"),
        variant: "error"
      });
    }
  };

  const clearFilters = () => setFilters(emptyFilters);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Track important BudgetFlow updates across budgets, recurring transactions, security, privacy, and exports."
        actions={
          <>
            <Button disabled={isLoading || isMutating} onClick={() => void reload()} type="button" variant="outline">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button disabled={isLoading || isMutating} onClick={handleMarkAllRead} type="button">
              {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
              Mark all read
            </Button>
          </>
        }
      />

      <SectionCard title="Filters" description="Narrow notifications by status, category, severity, type, or date range.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="block space-y-2 xl:col-span-2">
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Search</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                disabled={isLoading}
                onChange={(event) => updateFilter({ search: event.target.value })}
                placeholder="budget, security, recurring..."
                value={filters.search ?? ""}
              />
            </div>
          </label>

          <FilterSelect
            disabled={isLoading}
            label="Status"
            onChange={(value) => updateFilter({ status: value as NotificationStatus | "" })}
            value={filters.status ?? ""}
          >
            <option value="">All statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {notificationStatusLabels[status]}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            disabled={isLoading}
            label="Category"
            onChange={(value) => updateFilter({ category: value as NotificationCategory | "" })}
            value={filters.category ?? ""}
          >
            <option value="">All categories</option>
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {notificationCategoryLabels[category]}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            disabled={isLoading}
            label="Severity"
            onChange={(value) => updateFilter({ severity: value as NotificationSeverity | "" })}
            value={filters.severity ?? ""}
          >
            <option value="">All severities</option>
            {severityOptions.map((severity) => (
              <option key={severity} value={severity}>
                {notificationSeverityLabels[severity]}
              </option>
            ))}
          </FilterSelect>

          <FilterInput
            disabled={isLoading}
            label="Type"
            onChange={(value) => updateFilter({ type: value })}
            placeholder="security.new_login"
            value={filters.type ?? ""}
          />

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

      <SectionCard
        title="Notification Center"
        description={`${pagination.totalItems} notification${pagination.totalItems === 1 ? "" : "s"} found.`}
      >
        {isLoading ? <NotificationSkeleton /> : null}

        {!isLoading && errorMessage ? (
          <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            <p>{errorMessage}</p>
            <Button className="mt-3" onClick={() => void reload()} type="button" variant="outline">
              Retry
            </Button>
          </div>
        ) : null}

        {!isLoading && !errorMessage && notifications.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
            <Bell className="mx-auto h-6 w-6 text-primary" />
            <h2 className="mt-3 text-base font-semibold text-foreground">No notifications yet.</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Meaningful account, finance, and security updates will show up here.
            </p>
          </div>
        ) : null}

        {!isLoading && !errorMessage && notifications.length > 0 ? (
          <div className="space-y-4">
            <div className="space-y-3">
              {notifications.map((notification) => (
                <NotificationRow
                  isMutating={isMutating}
                  key={notification.id}
                  notification={notification}
                  onArchive={() => void handleArchive(notification)}
                  onMarkRead={() => void handleMarkRead(notification)}
                  onOpen={() => void handleOpenNotification(notification)}
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
    </div>
  );
}

function NotificationRow({
  isMutating,
  notification,
  onArchive,
  onMarkRead,
  onOpen
}: {
  isMutating: boolean;
  notification: Notification;
  onArchive: () => void;
  onMarkRead: () => void;
  onOpen: () => void;
}) {
  const isUnread = notification.status === "UNREAD";
  const isArchived = notification.status === "ARCHIVED";

  return (
    <article
      className={cn(
        "rounded-lg border p-4 transition-colors",
        isUnread ? "border-primary/20 bg-secondary/35" : "border-border bg-card hover:border-primary/25"
      )}
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span aria-hidden="true" className={cn("h-2.5 w-2.5 rounded-full", isUnread ? "bg-primary" : "bg-muted-foreground/30")} />
            <SensitiveText className="font-semibold text-foreground" text={notification.title} />
            <StatusBadge status={notification.status} />
            <SeverityBadge severity={notification.severity} />
          </div>
          <SensitiveText className="mt-2 block text-sm leading-6 text-muted-foreground" text={notification.message} />
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>{notificationCategoryLabels[notification.category]}</span>
            <span aria-hidden="true">-</span>
            <span>{formatNotificationType(notification.type)}</span>
            <span aria-hidden="true">-</span>
            <span>{formatNotificationEntity(notification.entityType)}</span>
            <span aria-hidden="true">-</span>
            <span>{formatRelativeTime(notification.createdAt)}</span>
          </div>
          <MetadataPreview metadata={notification.metadata} />
          <p className="mt-3 text-xs text-muted-foreground">Created {formatDateTime(notification.createdAt)}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          <Button disabled={isMutating || !isUnread || isArchived} onClick={onMarkRead} size="sm" type="button" variant="outline">
            <Check className="h-4 w-4" />
            Mark read
          </Button>
          <Button disabled={isMutating} onClick={onOpen} size="sm" type="button">
            Open
          </Button>
          <Button disabled={isMutating || isArchived} onClick={onArchive} size="sm" type="button" variant="outline">
            <Archive className="h-4 w-4" />
            Archive
          </Button>
        </div>
      </div>
    </article>
  );
}

function MetadataPreview({ metadata }: { metadata?: Record<string, unknown> | null }) {
  const entries = Object.entries(metadata ?? {}).filter(([, value]) => value !== null && value !== undefined);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 grid gap-2 text-sm md:grid-cols-2 xl:grid-cols-3">
      {entries.slice(0, 6).map(([key, value]) => (
        <div className="rounded-md bg-muted/40 px-3 py-2" key={key}>
          <p className="text-xs text-muted-foreground">{formatFieldLabel(key)}</p>
          <div className="mt-1 break-words font-medium text-foreground">{formatNotificationValue(key, value)}</div>
        </div>
      ))}
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

function StatusBadge({ status }: { status: NotificationStatus }) {
  const variant = status === "UNREAD" ? "default" : status === "ARCHIVED" ? "muted" : "outline";

  return <Badge variant={variant}>{notificationStatusLabels[status]}</Badge>;
}

function SeverityBadge({ severity }: { severity: NotificationSeverity }) {
  const variant = severity === "CRITICAL" ? "danger" : severity === "WARNING" ? "warning" : severity === "SUCCESS" ? "success" : "muted";

  return <Badge variant={variant}>{notificationSeverityLabels[severity]}</Badge>;
}

function NotificationSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div className="rounded-lg border border-border p-4" key={index}>
          <div className="h-5 w-56 animate-pulse rounded bg-muted" />
          <div className="mt-3 h-4 w-full animate-pulse rounded bg-muted" />
          <div className="mt-4 grid gap-2 md:grid-cols-3">
            <div className="h-12 animate-pulse rounded bg-muted" />
            <div className="h-12 animate-pulse rounded bg-muted" />
            <div className="h-12 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function formatNotificationValue(field: string, value: unknown): ReactNode {
  if (value === null || value === undefined || value === "") {
    return "None";
  }

  if (typeof value === "number") {
    if (isFinancialField(field)) {
      return <SensitiveValue className="min-w-0" format="currency" value={value} />;
    }

    if (/percentage|percent|usage/i.test(field)) {
      return <SensitiveValue className="min-w-0" format="percent" value={value} />;
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

  return <SensitiveText text={stringValue} />;
}

function formatFieldLabel(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isFinancialField(field: string) {
  return /(amount|balance|limit|paid|remaining|target|saved|expense|income|cashflow|cash_flow)/i.test(field);
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}T/.test(value) && !Number.isNaN(new Date(value).getTime());
}
