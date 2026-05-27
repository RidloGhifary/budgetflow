import type { AuditLogResult, AuditLogSeverity } from "@prisma/client";

import { logger } from "../../lib/logger";
import { NotFoundError } from "../../utils/app-error";
import type { AuditAction, AuditEntityType } from "./audit-log.constants";
import type { AuditRequestContext } from "./audit-log.context";
import { toAuditLogDetailResponse, toAuditLogSummaryResponse } from "./audit-log.mapper";
import { createAuditLog, findAuditLogById, findAuditLogs } from "./audit-log.repository";
import { sanitizeAuditPayload } from "./audit-log.sanitizer";
import type { AuditLogQueryInput } from "./audit-log.validators";

export interface RecordAuditLogInput {
  action: AuditAction | string;
  actorUserId?: string | null;
  afterSnapshot?: unknown;
  beforeSnapshot?: unknown;
  context?: AuditRequestContext;
  entityId?: string | null;
  entityType?: AuditEntityType | string | null;
  errorMessage?: string | null;
  metadata?: unknown;
  result?: AuditLogResult;
  severity?: AuditLogSeverity;
  userId?: string | null;
}

export async function listUserAuditLogs(userId: string, filters: AuditLogQueryInput) {
  const result = await findAuditLogs(userId, filters);

  return {
    auditLogs: result.auditLogs.map(toAuditLogSummaryResponse),
    pagination: result.pagination
  };
}

export async function getUserAuditLog(userId: string, id: string) {
  const auditLog = await findAuditLogById(userId, id);

  if (!auditLog) {
    throw new NotFoundError("Audit log was not found");
  }

  return toAuditLogDetailResponse(auditLog);
}

export async function recordAuditLog(input: RecordAuditLogInput) {
  return createAuditLog({
    action: input.action,
    actorUserId: input.actorUserId ?? input.context?.actorUserId ?? input.userId ?? null,
    afterSnapshot: sanitizeAuditPayload(input.afterSnapshot),
    beforeSnapshot: sanitizeAuditPayload(input.beforeSnapshot),
    browser: input.context?.browser ?? null,
    correlationId: trimOptional(input.context?.correlationId),
    deviceType: input.context?.deviceType ?? null,
    entityId: input.entityId ?? null,
    entityType: input.entityType ?? null,
    errorMessage: trimOptional(input.errorMessage, 500),
    ipAddress: input.context?.ipAddress ?? null,
    metadata: sanitizeAuditPayload(buildAuditMetadata(input.metadata, input.context)),
    operatingSystem: input.context?.operatingSystem ?? null,
    requestId: trimOptional(input.context?.requestId),
    result: input.result ?? "SUCCESS",
    sessionId: input.context?.sessionId ?? null,
    severity: input.severity ?? "INFO",
    userAgent: input.context?.userAgent ?? null,
    userId: input.userId ?? input.context?.actorUserId ?? null
  });
}

export async function recordAuditLogSafely(input: RecordAuditLogInput) {
  try {
    await recordAuditLog(input);
  } catch (error) {
    logger.error(
      {
        action: input.action,
        entityId: input.entityId,
        entityType: input.entityType,
        error
      },
      "audit log write failed"
    );
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function buildAuditMetadata(metadata: unknown, context?: AuditRequestContext) {
  const safeMetadata =
    metadata === undefined
      ? {}
      : isObject(metadata)
        ? metadata
        : { value: metadata };

  return {
    ...safeMetadata,
    ...(context?.method ? { method: context.method } : {}),
    ...(context?.route ? { route: context.route } : {})
  };
}

function trimOptional(value?: string | null, length = 120) {
  if (!value) {
    return null;
  }

  return value.slice(0, length);
}
