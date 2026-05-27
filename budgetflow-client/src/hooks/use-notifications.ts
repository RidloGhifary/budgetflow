"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { getFriendlyApiError } from "@/lib/api/http";
import { notificationsApi, type NotificationFilters } from "@/lib/api/notifications.api";
import type { Notification, PaginationMeta } from "@/types/api";

const emptyPagination: PaginationMeta = {
  page: 1,
  pageSize: 10,
  totalItems: 0,
  totalPages: 1
};

export function useNotifications(filters: NotificationFilters) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>(emptyPagination);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await notificationsApi.list(filters);
      setNotifications(response.data.notifications);
      setPagination(response.data.pagination);
    } catch (error) {
      setErrorMessage(getFriendlyApiError(error, "loadNotifications"));
    } finally {
      setIsLoading(false);
    }
  }, [filterKey, filters]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const markNotificationRead = useCallback(
    async (id: string) => {
      setIsMutating(true);

      try {
        const response = await notificationsApi.markRead(id);
        setNotifications((current) =>
          current.map((notification) => (notification.id === id ? response.data.notification : notification))
        );
        return response.data.notification;
      } finally {
        setIsMutating(false);
      }
    },
    []
  );

  const markAllNotificationsRead = useCallback(async () => {
    setIsMutating(true);

    try {
      const response = await notificationsApi.markAllRead();
      await loadNotifications();
      return response.data.updatedCount;
    } finally {
      setIsMutating(false);
    }
  }, [loadNotifications]);

  const archiveNotification = useCallback(
    async (id: string) => {
      setIsMutating(true);

      try {
        const response = await notificationsApi.archive(id);
        await loadNotifications();
        return response.data.archivedNotificationId;
      } finally {
        setIsMutating(false);
      }
    },
    [loadNotifications]
  );

  return {
    archiveNotification,
    errorMessage,
    isLoading,
    isMutating,
    markAllNotificationsRead,
    markNotificationRead,
    notifications,
    pagination,
    reload: loadNotifications
  };
}
