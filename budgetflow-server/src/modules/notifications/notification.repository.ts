import {
  Prisma,
  type NotificationCategory,
  type NotificationSeverity,
  type NotificationStatus
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type { NotificationQueryInput } from "./notification.validators";

const notificationSelect = {
  id: true,
  userId: true,
  type: true,
  category: true,
  severity: true,
  title: true,
  message: true,
  status: true,
  actionUrl: true,
  entityType: true,
  entityId: true,
  metadata: true,
  readAt: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.NotificationSelect;

export type NotificationRecord = Prisma.NotificationGetPayload<{
  select: typeof notificationSelect;
}>;

export interface CreateNotificationData {
  actionUrl?: string | null;
  category: NotificationCategory;
  dedupeKey?: string | null;
  entityId?: string | null;
  entityType?: string | null;
  message: string;
  metadata?: Prisma.InputJsonValue | null;
  severity: NotificationSeverity;
  title: string;
  type: string;
  userId: string;
}

export function createNotification(data: CreateNotificationData) {
  return prisma.notification.create({
    data: data as Prisma.NotificationUncheckedCreateInput,
    select: notificationSelect
  });
}

export async function findNotifications(userId: string, filters: NotificationQueryInput) {
  const where = buildNotificationWhere(userId, filters);
  const page = filters.page;
  const pageSize = filters.pageSize;
  const [notifications, totalItems] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: notificationSelect,
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.notification.count({ where })
  ]);

  return {
    notifications,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pageSize))
    }
  };
}

export function countUnreadNotifications(userId: string) {
  return prisma.notification.count({
    where: {
      userId,
      status: "UNREAD",
      archivedAt: null
    }
  });
}

export function findNotificationById(userId: string, id: string) {
  return prisma.notification.findFirst({
    where: {
      id,
      userId
    },
    select: notificationSelect
  });
}

export function markNotificationRead(userId: string, id: string) {
  return prisma.notification.updateMany({
    where: {
      id,
      userId,
      archivedAt: null
    },
    data: {
      readAt: new Date(),
      status: "READ"
    }
  });
}

export function markAllNotificationsRead(userId: string) {
  return prisma.notification.updateMany({
    where: {
      userId,
      archivedAt: null,
      status: "UNREAD"
    },
    data: {
      readAt: new Date(),
      status: "READ"
    }
  });
}

export function archiveNotification(userId: string, id: string) {
  return prisma.notification.updateMany({
    where: {
      id,
      userId,
      archivedAt: null
    },
    data: {
      archivedAt: new Date(),
      status: "ARCHIVED"
    }
  });
}

function buildNotificationWhere(userId: string, filters: NotificationQueryInput): Prisma.NotificationWhereInput {
  const andFilters: Prisma.NotificationWhereInput[] = [{ userId }];

  if (filters.status) {
    andFilters.push({ status: filters.status });
  } else {
    andFilters.push({ archivedAt: null });
  }

  if (filters.category) {
    andFilters.push({ category: filters.category });
  }

  if (filters.severity) {
    andFilters.push({ severity: filters.severity });
  }

  if (filters.type) {
    andFilters.push({ type: filters.type });
  }

  if (filters.startDate || filters.endDate) {
    andFilters.push({
      createdAt: {
        ...(filters.startDate ? { gte: filters.startDate } : {}),
        ...(filters.endDate ? { lte: endOfDay(filters.endDate) } : {})
      }
    });
  }

  if (filters.search) {
    andFilters.push({
      OR: [
        { title: { contains: filters.search, mode: "insensitive" } },
        { message: { contains: filters.search, mode: "insensitive" } },
        { type: { contains: filters.search, mode: "insensitive" } },
        { entityType: { contains: filters.search, mode: "insensitive" } },
        { entityId: { contains: filters.search, mode: "insensitive" } }
      ]
    });
  }

  return {
    AND: andFilters
  };
}

function endOfDay(date: Date) {
  const nextDay = new Date(date);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  nextDay.setUTCHours(0, 0, 0, 0);

  return new Date(nextDay.getTime() - 1);
}
