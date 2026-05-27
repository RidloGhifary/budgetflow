"use client";

import { useEffect, useRef, useState } from "react";
import { Archive, Bell, CheckCheck, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { SensitiveText, SensitiveValue } from "@/components/privacy/sensitive-value";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getFriendlyApiError } from "@/lib/api/http";
import { formatRelativeTime } from "@/lib/format";
import {
  notificationCategoryLabels,
  notificationSeverityLabels,
  notificationStatusLabels
} from "@/lib/notification-labels";
import { cn } from "@/lib/utils";
import { useNotificationsCenter } from "@/providers/notifications-provider";
import { useToast } from "@/providers/toast-provider";
import type { Notification, NotificationSeverity } from "@/types/api";

export function NotificationBell() {
  const router = useRouter();
  const { showToast } = useToast();
  const {
    archiveNotification,
    errorMessage,
    hasUnread,
    isLoadingRecent,
    markAllNotificationsRead,
    markNotificationRead,
    recentNotifications,
    refreshRecentNotifications,
    unreadCount
  } = useNotificationsCenter();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    void refreshRecentNotifications();
  }, [isOpen, refreshRecentNotifications]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const handleNotificationClick = async (notification: Notification) => {
    try {
      if (notification.status === "UNREAD") {
        await markNotificationRead(notification.id);
      }

      setIsOpen(false);
      router.push(notification.actionUrl || "/notifications");
    } catch (error) {
      showToast({
        title: "Notification not updated",
        description: getFriendlyApiError(error, "updateNotification"),
        variant: "error"
      });
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const updatedCount = await markAllNotificationsRead();
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
      showToast({ title: "Notification archived", variant: "success" });
    } catch (error) {
      showToast({
        title: "Notification not archived",
        description: getFriendlyApiError(error, "updateNotification"),
        variant: "error"
      });
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <Button
        aria-expanded={isOpen}
        aria-label="Open notifications"
        className="relative"
        onClick={() => setIsOpen((current) => !current)}
        size="icon"
        type="button"
        variant="outline"
      >
        <Bell className="h-4 w-4" />
        {hasUnread ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </Button>

      {isOpen ? (
        <div className="absolute right-0 top-12 z-50 w-[min(92vw,420px)] overflow-hidden rounded-lg border border-border bg-card shadow-xl">
          <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <p className="font-semibold text-foreground">Notifications</p>
              <p className="text-xs text-muted-foreground">
                {hasUnread ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}` : "All caught up"}
              </p>
            </div>
            <Button disabled={!hasUnread} onClick={handleMarkAllRead} size="sm" type="button" variant="outline">
              <CheckCheck className="h-4 w-4" />
              Mark read
            </Button>
          </div>

          <div className="max-h-[420px] overflow-y-auto p-2">
            {isLoadingRecent ? <NotificationDropdownSkeleton /> : null}

            {!isLoadingRecent && errorMessage ? (
              <div className="rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                <p>{errorMessage}</p>
                <Button className="mt-3" onClick={() => void refreshRecentNotifications()} size="sm" type="button" variant="outline">
                  Retry
                </Button>
              </div>
            ) : null}

            {!isLoadingRecent && !errorMessage && recentNotifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="mx-auto h-6 w-6 text-primary" />
                <p className="mt-3 text-sm font-semibold text-foreground">No notifications yet.</p>
                <p className="mt-1 text-xs text-muted-foreground">Important account updates will appear here.</p>
              </div>
            ) : null}

            {!isLoadingRecent && !errorMessage && recentNotifications.length > 0 ? (
              <div className="space-y-1">
                {recentNotifications.map((notification) => (
                  <NotificationDropdownItem
                    key={notification.id}
                    notification={notification}
                    onArchive={() => void handleArchive(notification)}
                    onClick={() => void handleNotificationClick(notification)}
                  />
                ))}
              </div>
            ) : null}
          </div>

          <div className="border-t border-border p-2">
            <Button
              className="w-full"
              onClick={() => {
                setIsOpen(false);
                router.push("/notifications");
              }}
              type="button"
              variant="ghost"
            >
              View all notifications
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function NotificationDropdownItem({
  notification,
  onArchive,
  onClick
}: {
  notification: Notification;
  onArchive: () => void;
  onClick: () => void;
}) {
  const isUnread = notification.status === "UNREAD";

  return (
    <article
      className={cn(
        "group rounded-md border border-transparent p-3 transition-colors hover:border-primary/20 hover:bg-muted/50",
        isUnread && "bg-secondary/35"
      )}
    >
      <button className="block w-full text-left" onClick={onClick} type="button">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", isUnread ? "bg-primary" : "bg-muted-foreground/30")}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <SensitiveText
                className="break-words text-sm font-semibold text-foreground"
                text={notification.title}
              />
              <SeverityBadge severity={notification.severity} />
            </div>
            <SensitiveText className="mt-1 block text-sm leading-5 text-muted-foreground" text={notification.message} />
            <NotificationMetadataSummary notification={notification} />
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{notificationCategoryLabels[notification.category]}</span>
              <span aria-hidden="true">-</span>
              <span>{notificationStatusLabels[notification.status]}</span>
              <span aria-hidden="true">-</span>
              <span>{formatRelativeTime(notification.createdAt)}</span>
            </div>
          </div>
        </div>
      </button>
      <div className="mt-2 flex justify-end opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
        <Button onClick={onArchive} size="sm" type="button" variant="ghost">
          <Archive className="h-4 w-4" />
          Archive
        </Button>
      </div>
    </article>
  );
}

function NotificationMetadataSummary({ notification }: { notification: Notification }) {
  const metadata = notification.metadata ?? {};
  const amount = getNumericMetadata(metadata, "amount");
  const usedAmount = getNumericMetadata(metadata, "usedAmount");
  const limitAmount = getNumericMetadata(metadata, "limitAmount");
  const percentageUsed = getNumericMetadata(metadata, "percentageUsed");

  if (amount === null && usedAmount === null && limitAmount === null && percentageUsed === null) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
      {amount !== null ? (
        <span>
          Amount: <SensitiveValue className="min-w-0" format="currency" value={amount} />
        </span>
      ) : null}
      {usedAmount !== null ? (
        <span>
          Used: <SensitiveValue className="min-w-0" format="currency" value={usedAmount} />
        </span>
      ) : null}
      {limitAmount !== null ? (
        <span>
          Limit: <SensitiveValue className="min-w-0" format="currency" value={limitAmount} />
        </span>
      ) : null}
      {percentageUsed !== null ? (
        <span>
          Usage: <SensitiveValue className="min-w-0" format="percent" value={percentageUsed} />
        </span>
      ) : null}
    </div>
  );
}

function SeverityBadge({ severity }: { severity: NotificationSeverity }) {
  const variant = severity === "CRITICAL" ? "danger" : severity === "WARNING" ? "warning" : severity === "SUCCESS" ? "success" : "muted";

  return <Badge variant={variant}>{notificationSeverityLabels[severity]}</Badge>;
}

function NotificationDropdownSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, index) => (
        <div className="rounded-md border border-border p-3" key={index}>
          <div className="h-4 w-40 animate-pulse rounded bg-muted" />
          <div className="mt-3 h-3 w-full animate-pulse rounded bg-muted" />
          <div className="mt-2 h-3 w-28 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function getNumericMetadata(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Number(value);
  }

  return null;
}
