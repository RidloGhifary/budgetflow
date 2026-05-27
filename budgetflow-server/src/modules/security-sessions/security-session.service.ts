import type { AuthSession } from "@prisma/client";

import { NotFoundError, UnauthorizedError } from "../../utils/app-error";
import type { SessionMetadata } from "../../utils/request-metadata";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "../audit-logs/audit-log.constants";
import type { AuditRequestContext } from "../audit-logs/audit-log.context";
import { recordAuditLogSafely } from "../audit-logs/audit-log.service";
import { NOTIFICATION_ENTITY_TYPES, NOTIFICATION_TYPES } from "../notifications/notification.constants";
import { createUserNotificationSafely } from "../notifications/notification.service";
import { toSecuritySessionResponse } from "./security-session.mapper";
import {
  createAuthSession,
  findActiveAuthSession,
  findActiveAuthSessions,
  findAuthSession,
  revokeAuthSession,
  revokeOtherAuthSessions,
  updateAuthSessionActivity
} from "./security-session.repository";

const lastActiveUpdateIntervalMs = 5 * 60 * 1000;

export async function createUserSession(userId: string, metadata: SessionMetadata) {
  const session = await createAuthSession(userId, metadata);

  await recordAuditLogSafely({
    action: AUDIT_ACTIONS.SESSION_CREATED,
    context: {
      ...metadata,
      actorUserId: userId,
      sessionId: session.id
    },
    entityId: session.id,
    entityType: AUDIT_ENTITY_TYPES.SESSION,
    metadata: {
      deviceName: session.deviceName,
      source: "auth"
    },
    userId
  });

  await createUserNotificationSafely({
    actionUrl: "/settings",
    category: "SECURITY",
    dedupeKey: `security.new_login:${session.id}`,
    entityId: session.id,
    entityType: NOTIFICATION_ENTITY_TYPES.SESSION,
    message: "A new BudgetFlow session was created for your account.",
    metadata: {
      browser: session.browser,
      deviceName: session.deviceName,
      deviceType: session.deviceType,
      ipAddress: session.ipAddress,
      operatingSystem: session.operatingSystem
    },
    severity: "WARNING",
    title: "New login detected",
    type: NOTIFICATION_TYPES.SECURITY_NEW_LOGIN,
    userId
  });

  return session;
}

export async function getActiveSessionOrThrow(userId: string, sessionId: string, metadata: SessionMetadata) {
  const session = await findActiveAuthSession(userId, sessionId);

  if (!session) {
    throw new UnauthorizedError("Session has expired. Please log in again.");
  }

  if (shouldRefreshLastActive(session)) {
    await updateAuthSessionActivity(session, metadata);
  }

  return session;
}

export async function listUserSessions(userId: string, currentSessionId: string) {
  const sessions = await findActiveAuthSessions(userId);

  return sessions.map((session) => toSecuritySessionResponse(session, currentSessionId));
}

export async function revokeUserSession(
  userId: string,
  sessionId: string,
  currentSessionId: string,
  context?: AuditRequestContext
) {
  const session = await findAuthSession(userId, sessionId);

  if (!session || session.revokedAt) {
    throw new NotFoundError("Session was not found");
  }

  await revokeAuthSession(userId, sessionId);

  await recordAuditLogSafely({
    action: AUDIT_ACTIONS.SESSION_REVOKED,
    beforeSnapshot: {
      browser: session.browser,
      createdAt: session.createdAt,
      deviceName: session.deviceName,
      deviceType: session.deviceType,
      ipAddress: session.ipAddress,
      lastActiveAt: session.lastActiveAt,
      operatingSystem: session.operatingSystem
    },
    context,
    entityId: sessionId,
    entityType: AUDIT_ENTITY_TYPES.SESSION,
    metadata: {
      revokedCurrentSession: sessionId === currentSessionId
    },
    userId
  });

  await createUserNotificationSafely({
    actionUrl: "/settings",
    category: "SECURITY",
    dedupeKey: `security.session_revoked:${sessionId}`,
    entityId: sessionId,
    entityType: NOTIFICATION_ENTITY_TYPES.SESSION,
    message: sessionId === currentSessionId ? "Your current session was logged out." : "One of your sessions was logged out.",
    metadata: {
      browser: session.browser,
      deviceName: session.deviceName,
      revokedCurrentSession: sessionId === currentSessionId
    },
    severity: sessionId === currentSessionId ? "WARNING" : "INFO",
    title: "Session logged out",
    type: NOTIFICATION_TYPES.SECURITY_SESSION_REVOKED,
    userId
  });

  return {
    revokedSessionId: sessionId,
    revokedCurrentSession: sessionId === currentSessionId
  };
}

export async function revokeOtherUserSessions(userId: string, currentSessionId: string, context?: AuditRequestContext) {
  const result = await revokeOtherAuthSessions(userId, currentSessionId);

  await recordAuditLogSafely({
    action: AUDIT_ACTIONS.SESSION_LOGOUT_OTHERS,
    context,
    entityId: currentSessionId,
    entityType: AUDIT_ENTITY_TYPES.SESSION,
    metadata: {
      revokedCount: result.count
    },
    userId
  });

  await createUserNotificationSafely({
    actionUrl: "/settings",
    category: "SECURITY",
    dedupeKey: `security.logout_others:${currentSessionId}:${new Date().toISOString().slice(0, 10)}`,
    entityId: currentSessionId,
    entityType: NOTIFICATION_ENTITY_TYPES.SESSION,
    message: `${result.count} other active session${result.count === 1 ? "" : "s"} were logged out.`,
    metadata: {
      revokedCount: result.count
    },
    severity: "INFO",
    title: "Other devices logged out",
    type: NOTIFICATION_TYPES.SECURITY_LOGOUT_OTHERS,
    userId
  });

  return {
    revokedCount: result.count
  };
}

function shouldRefreshLastActive(session: AuthSession) {
  return Date.now() - session.lastActiveAt.getTime() > lastActiveUpdateIntervalMs;
}
