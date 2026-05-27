import type { NotificationCategory, NotificationSeverity } from "@prisma/client";

import { logger } from "../../lib/logger";
import { NotFoundError } from "../../utils/app-error";
import { isPrismaUniqueConstraintError } from "../../utils/prisma-error";
import type { NotificationEntityType, NotificationType } from "./notification.constants";
import { toNotificationResponse } from "./notification.mapper";
import {
  archiveNotification,
  countUnreadNotifications,
  createNotification,
  findNotificationById,
  findNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from "./notification.repository";
import { sanitizeNotificationMetadata } from "./notification.sanitizer";
import type { NotificationQueryInput } from "./notification.validators";

export interface CreateNotificationInput {
  actionUrl?: string | null;
  category: NotificationCategory;
  dedupeKey?: string | null;
  entityId?: string | null;
  entityType?: NotificationEntityType | string | null;
  message: string;
  metadata?: unknown;
  severity?: NotificationSeverity;
  title: string;
  type: NotificationType | string;
  userId: string;
}

export async function createUserNotification(input: CreateNotificationInput) {
  try {
    const notification = await createNotification({
      actionUrl: input.actionUrl ?? null,
      category: input.category,
      dedupeKey: input.dedupeKey ?? null,
      entityId: input.entityId ?? null,
      entityType: input.entityType ?? null,
      message: input.message,
      metadata: sanitizeNotificationMetadata(input.metadata),
      severity: input.severity ?? "INFO",
      title: input.title,
      type: input.type,
      userId: input.userId
    });

    return toNotificationResponse(notification);
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      return null;
    }

    throw error;
  }
}

export async function createUserNotificationSafely(input: CreateNotificationInput) {
  try {
    return await createUserNotification(input);
  } catch (error) {
    logger.error(
      {
        entityId: input.entityId,
        entityType: input.entityType,
        error,
        type: input.type,
        userId: input.userId
      },
      "notification write failed"
    );

    return null;
  }
}

export async function listUserNotifications(userId: string, filters: NotificationQueryInput) {
  const result = await findNotifications(userId, filters);

  return {
    notifications: result.notifications.map(toNotificationResponse),
    pagination: result.pagination
  };
}

export async function getUserUnreadNotificationCount(userId: string) {
  const unreadCount = await countUnreadNotifications(userId);

  return {
    hasUnread: unreadCount > 0,
    unreadCount
  };
}

export async function markUserNotificationRead(userId: string, id: string) {
  const notification = await findNotificationById(userId, id);

  if (!notification || notification.archivedAt) {
    throw new NotFoundError("Notification was not found");
  }

  if (notification.status !== "READ") {
    await markNotificationRead(userId, id);
  }

  const updated = await findNotificationById(userId, id);

  if (!updated) {
    throw new NotFoundError("Notification was not found");
  }

  return toNotificationResponse(updated);
}

export async function markAllUserNotificationsRead(userId: string) {
  const result = await markAllNotificationsRead(userId);

  return {
    updatedCount: result.count
  };
}

export async function archiveUserNotification(userId: string, id: string) {
  const notification = await findNotificationById(userId, id);

  if (!notification || notification.archivedAt) {
    throw new NotFoundError("Notification was not found");
  }

  await archiveNotification(userId, id);

  return {
    archivedNotificationId: id
  };
}
