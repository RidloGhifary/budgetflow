import type { AuthSession } from "@prisma/client";

export function toSecuritySessionResponse(session: AuthSession, currentSessionId: string) {
  return {
    id: session.id,
    browser: session.browser ?? "Unknown browser",
    operatingSystem: session.operatingSystem ?? "Unknown OS",
    deviceType: session.deviceType ?? "Unknown device",
    deviceName: session.deviceName ?? "Unknown device",
    ipAddress: session.ipAddress ?? "Unknown IP",
    createdAt: session.createdAt,
    lastActiveAt: session.lastActiveAt,
    isCurrent: session.id === currentSessionId
  };
}
