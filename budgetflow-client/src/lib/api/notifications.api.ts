import { apiRequest } from "@/lib/api/http";
import type {
  ApiEnvelope,
  Notification,
  NotificationCategory,
  NotificationSeverity,
  NotificationStatus,
  PaginationMeta
} from "@/types/api";

export interface NotificationFilters {
  category?: NotificationCategory | "";
  endDate?: string;
  page: number;
  pageSize: number;
  search?: string;
  severity?: NotificationSeverity | "";
  startDate?: string;
  status?: NotificationStatus | "";
  type?: string;
}

function buildQueryString(filters: NotificationFilters) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });

  const queryString = params.toString();

  return queryString ? `?${queryString}` : "";
}

export const notificationsApi = {
  list(filters: NotificationFilters) {
    return apiRequest<
      ApiEnvelope<{
        notifications: Notification[];
        pagination: PaginationMeta;
      }>
    >(`/notifications${buildQueryString(filters)}`);
  },

  unreadCount() {
    return apiRequest<
      ApiEnvelope<{
        hasUnread: boolean;
        unreadCount: number;
      }>
    >("/notifications/unread-count");
  },

  markRead(id: string) {
    return apiRequest<ApiEnvelope<{ notification: Notification }>>(`/notifications/${id}/read`, {
      method: "PATCH"
    });
  },

  markAllRead() {
    return apiRequest<
      ApiEnvelope<{
        updatedCount: number;
      }>
    >("/notifications/read-all", {
      method: "PATCH"
    });
  },

  archive(id: string) {
    return apiRequest<
      ApiEnvelope<{
        archivedNotificationId: string;
      }>
    >(`/notifications/${id}/archive`, {
      method: "PATCH"
    });
  }
};
