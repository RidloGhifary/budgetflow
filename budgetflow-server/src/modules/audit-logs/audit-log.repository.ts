import { Prisma, type AuditLogResult, type AuditLogSeverity } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type { AuditLogQueryInput } from "./audit-log.validators";

export interface CreateAuditLogData {
  action: string;
  actorUserId?: string | null;
  afterSnapshot?: Prisma.InputJsonValue | null;
  beforeSnapshot?: Prisma.InputJsonValue | null;
  browser?: string | null;
  correlationId?: string | null;
  deviceType?: string | null;
  entityId?: string | null;
  entityType?: string | null;
  errorMessage?: string | null;
  ipAddress?: string | null;
  metadata?: Prisma.InputJsonValue | null;
  operatingSystem?: string | null;
  requestId?: string | null;
  result: AuditLogResult;
  sessionId?: string | null;
  severity: AuditLogSeverity;
  userAgent?: string | null;
  userId?: string | null;
}

export type AuditLogSummaryRecord = Prisma.AuditLogGetPayload<{
  select: typeof auditLogSummarySelect;
}>;

export type AuditLogDetailRecord = Prisma.AuditLogGetPayload<{
  select: typeof auditLogDetailSelect;
}>;

const auditLogSummarySelect = {
  id: true,
  action: true,
  entityType: true,
  entityId: true,
  result: true,
  severity: true,
  ipAddress: true,
  browser: true,
  operatingSystem: true,
  deviceType: true,
  sessionId: true,
  createdAt: true
} satisfies Prisma.AuditLogSelect;

const auditLogDetailSelect = {
  ...auditLogSummarySelect,
  userAgent: true,
  requestId: true,
  correlationId: true,
  beforeSnapshot: true,
  afterSnapshot: true,
  metadata: true,
  errorMessage: true
} satisfies Prisma.AuditLogSelect;

export function createAuditLog(data: CreateAuditLogData) {
  return prisma.auditLog.create({
    data: data as Prisma.AuditLogUncheckedCreateInput
  });
}

export async function findAuditLogs(userId: string, filters: AuditLogQueryInput) {
  const where = buildAuditLogWhere(userId, filters);
  const page = filters.page;
  const pageSize = filters.pageSize;
  const [auditLogs, totalItems] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: auditLogSummarySelect,
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.auditLog.count({ where })
  ]);

  return {
    auditLogs,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pageSize))
    }
  };
}

export function findAuditLogById(userId: string, id: string) {
  return prisma.auditLog.findFirst({
    where: {
      id,
      userId
    },
    select: auditLogDetailSelect
  });
}

function buildAuditLogWhere(userId: string, filters: AuditLogQueryInput): Prisma.AuditLogWhereInput {
  const andFilters: Prisma.AuditLogWhereInput[] = [{ userId }];

  if (filters.action) {
    andFilters.push({ action: filters.action });
  }

  if (filters.entityType) {
    andFilters.push({ entityType: filters.entityType });
  }

  if (filters.entityId) {
    andFilters.push({ entityId: filters.entityId });
  }

  if (filters.result) {
    andFilters.push({ result: filters.result });
  }

  if (filters.severity) {
    andFilters.push({ severity: filters.severity });
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
        { action: { contains: filters.search, mode: "insensitive" } },
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
