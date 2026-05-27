"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { getFriendlyApiError } from "@/lib/api/http";
import { notificationsApi } from "@/lib/api/notifications.api";
import { useAuth } from "@/providers/auth-provider";
import type { Notification } from "@/types/api";

interface NotificationsContextValue {
  archiveNotification: (id: string) => Promise<void>;
  errorMessage: string | null;
  hasUnread: boolean;
  isLoadingRecent: boolean;
  markAllNotificationsRead: () => Promise<number>;
  markNotificationRead: (id: string) => Promise<Notification>;
  recentNotifications: Notification[];
  refreshRecentNotifications: () => Promise<Notification[]>;
  refreshUnreadCount: () => Promise<number>;
  unreadCount: number;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [recentNotifications, setRecentNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetNotifications = useCallback(() => {
    setRecentNotifications([]);
    setUnreadCount(0);
    setErrorMessage(null);
    setIsLoadingRecent(false);
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return 0;
    }

    try {
      const response = await notificationsApi.unreadCount();
      setUnreadCount(response.data.unreadCount);
      return response.data.unreadCount;
    } catch (error) {
      setErrorMessage(getFriendlyApiError(error, "loadNotifications"));
      return 0;
    }
  }, [isAuthenticated]);

  const refreshRecentNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      resetNotifications();
      return [];
    }

    setIsLoadingRecent(true);
    setErrorMessage(null);

    try {
      const response = await notificationsApi.list({
        page: 1,
        pageSize: 5
      });
      setRecentNotifications(response.data.notifications);
      return response.data.notifications;
    } catch (error) {
      setErrorMessage(getFriendlyApiError(error, "loadNotifications"));
      return [];
    } finally {
      setIsLoadingRecent(false);
    }
  }, [isAuthenticated, resetNotifications]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!isAuthenticated) {
      resetNotifications();
      return;
    }

    void refreshUnreadCount();
    void refreshRecentNotifications();
  }, [isAuthenticated, isAuthLoading, refreshRecentNotifications, refreshUnreadCount, resetNotifications]);

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) {
      return;
    }

    const timer = window.setInterval(() => {
      void refreshUnreadCount();
    }, 60_000);

    return () => window.clearInterval(timer);
  }, [isAuthenticated, isAuthLoading, refreshUnreadCount]);

  const markNotificationRead = useCallback(
    async (id: string) => {
      const response = await notificationsApi.markRead(id);
      setRecentNotifications((current) =>
        current.map((notification) => (notification.id === id ? response.data.notification : notification))
      );
      await refreshUnreadCount();
      return response.data.notification;
    },
    [refreshUnreadCount]
  );

  const markAllNotificationsRead = useCallback(async () => {
    const response = await notificationsApi.markAllRead();
    setRecentNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        readAt: notification.readAt ?? new Date().toISOString(),
        status: "READ"
      }))
    );
    setUnreadCount(0);
    return response.data.updatedCount;
  }, []);

  const archiveNotification = useCallback(
    async (id: string) => {
      await notificationsApi.archive(id);
      setRecentNotifications((current) => current.filter((notification) => notification.id !== id));
      await refreshUnreadCount();
    },
    [refreshUnreadCount]
  );

  const value = useMemo(
    () => ({
      archiveNotification,
      errorMessage,
      hasUnread: unreadCount > 0,
      isLoadingRecent,
      markAllNotificationsRead,
      markNotificationRead,
      recentNotifications,
      refreshRecentNotifications,
      refreshUnreadCount,
      unreadCount
    }),
    [
      archiveNotification,
      errorMessage,
      isLoadingRecent,
      markAllNotificationsRead,
      markNotificationRead,
      recentNotifications,
      refreshRecentNotifications,
      refreshUnreadCount,
      unreadCount
    ]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotificationsCenter() {
  const context = useContext(NotificationsContext);

  if (!context) {
    throw new Error("useNotificationsCenter must be used within NotificationsProvider.");
  }

  return context;
}
