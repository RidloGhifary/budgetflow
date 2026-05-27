import type { LoginHistory } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import { logger } from "../../lib/logger";
import type { SessionMetadata } from "../../utils/request-metadata";

export const LOGIN_HISTORY_STATUS = {
  FAILURE: "FAILURE",
  SUCCESS: "SUCCESS"
} as const;

export const LOGIN_METHODS = {
  ACCOUNT_DATA_DOWNLOAD: "ACCOUNT_DATA_DOWNLOAD",
  ACCOUNT_DELETE: "ACCOUNT_DELETE",
  PASSWORD: "PASSWORD",
  PASSWORD_CHANGE: "PASSWORD_CHANGE",
  RECOVERY_CODE: "RECOVERY_CODE",
  TOTP: "TOTP"
} as const;

export interface LoginHistoryInput {
  userId?: string | null;
  attemptedEmail?: string | null;
  status: (typeof LOGIN_HISTORY_STATUS)[keyof typeof LOGIN_HISTORY_STATUS];
  method: (typeof LOGIN_METHODS)[keyof typeof LOGIN_METHODS];
  failureReason?: string | null;
  sessionId?: string | null;
  twoFactorRequired?: boolean;
  twoFactorPassed?: boolean;
  recoveryCodeUsed?: boolean;
  metadata: SessionMetadata;
}

export async function recordLoginHistory(input: LoginHistoryInput) {
  return prisma.loginHistory.create({
    data: {
      attemptedEmail: input.attemptedEmail,
      browser: input.metadata.browser,
      deviceType: input.metadata.deviceType,
      failureReason: input.failureReason,
      ipAddress: input.metadata.ipAddress,
      method: input.method,
      operatingSystem: input.metadata.operatingSystem,
      recoveryCodeUsed: input.recoveryCodeUsed ?? false,
      sessionId: input.sessionId,
      status: input.status,
      twoFactorPassed: input.twoFactorPassed ?? false,
      twoFactorRequired: input.twoFactorRequired ?? false,
      userAgent: input.metadata.userAgent,
      userId: input.userId
    }
  });
}

export async function recordLoginHistorySafely(input: LoginHistoryInput) {
  try {
    await recordLoginHistory(input);
  } catch (error) {
    logger.warn({ error, userId: input.userId, status: input.status, method: input.method }, "failed to record login history");
  }
}

export async function listLoginHistory(userId: string, limit = 30) {
  const rows = await prisma.loginHistory.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 100)
  });

  return rows.map(toLoginHistoryResponse);
}

export function toLoginHistoryResponse(row: LoginHistory) {
  return {
    id: row.id,
    browser: row.browser ?? "Unknown browser",
    createdAt: row.createdAt,
    deviceType: row.deviceType ?? "Unknown device",
    failureReason: row.failureReason,
    ipAddress: row.ipAddress ?? "Unknown IP",
    method: row.method,
    operatingSystem: row.operatingSystem ?? "Unknown OS",
    recoveryCodeUsed: row.recoveryCodeUsed,
    sessionId: row.sessionId,
    status: row.status,
    twoFactorPassed: row.twoFactorPassed,
    twoFactorRequired: row.twoFactorRequired
  };
}
