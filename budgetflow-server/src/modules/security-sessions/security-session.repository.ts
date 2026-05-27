import type { AuthSession } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type { SessionMetadata } from "../../utils/request-metadata";

export function createAuthSession(userId: string, metadata: SessionMetadata) {
  return prisma.authSession.create({
    data: {
      userId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      browser: metadata.browser,
      operatingSystem: metadata.operatingSystem,
      deviceType: metadata.deviceType,
      deviceName: metadata.deviceName
    }
  });
}

export function findAuthSession(userId: string, sessionId: string) {
  return prisma.authSession.findFirst({
    where: {
      id: sessionId,
      userId
    }
  });
}

export function findActiveAuthSession(userId: string, sessionId: string) {
  return prisma.authSession.findFirst({
    where: {
      id: sessionId,
      userId,
      revokedAt: null
    }
  });
}

export function findActiveAuthSessions(userId: string) {
  return prisma.authSession.findMany({
    where: {
      userId,
      revokedAt: null
    },
    orderBy: [{ lastActiveAt: "desc" }, { createdAt: "desc" }]
  });
}

export function updateAuthSessionActivity(session: AuthSession, metadata: SessionMetadata) {
  return prisma.authSession.update({
    where: { id: session.id },
    data: {
      lastActiveAt: new Date(),
      ipAddress: metadata.ipAddress ?? session.ipAddress,
      userAgent: metadata.userAgent ?? session.userAgent,
      browser: metadata.browser ?? session.browser,
      operatingSystem: metadata.operatingSystem ?? session.operatingSystem,
      deviceType: metadata.deviceType ?? session.deviceType,
      deviceName: metadata.deviceName ?? session.deviceName
    }
  });
}

export function revokeAuthSession(userId: string, sessionId: string) {
  return prisma.authSession.updateMany({
    where: {
      id: sessionId,
      userId,
      revokedAt: null
    },
    data: {
      revokedAt: new Date()
    }
  });
}

export function revokeOtherAuthSessions(userId: string, currentSessionId: string) {
  return prisma.authSession.updateMany({
    where: {
      userId,
      revokedAt: null,
      id: {
        not: currentSessionId
      }
    },
    data: {
      revokedAt: new Date()
    }
  });
}
