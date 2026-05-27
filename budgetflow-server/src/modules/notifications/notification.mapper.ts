import type { NotificationRecord } from "./notification.repository";

export function toNotificationResponse(notification: NotificationRecord) {
  return {
    id: notification.id,
    userId: notification.userId,
    type: notification.type,
    category: notification.category,
    severity: notification.severity,
    title: notification.title,
    message: notification.message,
    status: notification.status,
    actionUrl: notification.actionUrl,
    entityType: notification.entityType,
    entityId: notification.entityId,
    metadata: notification.metadata,
    readAt: notification.readAt,
    archivedAt: notification.archivedAt,
    createdAt: notification.createdAt,
    updatedAt: notification.updatedAt
  };
}
