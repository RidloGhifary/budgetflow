import type { Request } from "express";

export interface SessionMetadata {
  ipAddress?: string;
  userAgent?: string;
  browser?: string;
  operatingSystem?: string;
  deviceType?: string;
  deviceName?: string;
}

const maxStoredLength = 500;

export function getSessionMetadata(req: Request): SessionMetadata {
  const userAgent = trimForStorage(req.get("user-agent"));
  const parsed = parseUserAgent(userAgent ?? "");

  return {
    ipAddress: trimForStorage(getRequestIp(req), 64),
    userAgent,
    ...parsed
  };
}

function getRequestIp(req: Request) {
  const forwardedFor = req.get("x-forwarded-for");

  if (forwardedFor) {
    return normalizeIp(forwardedFor.split(",")[0]?.trim());
  }

  return normalizeIp(req.ip || req.socket.remoteAddress || undefined);
}

function normalizeIp(value?: string) {
  if (!value) {
    return undefined;
  }

  return value.replace(/^::ffff:/, "");
}

function trimForStorage(value?: string, length = maxStoredLength) {
  if (!value) {
    return undefined;
  }

  return value.slice(0, length);
}

function parseUserAgent(userAgent: string): Omit<SessionMetadata, "ipAddress" | "userAgent"> {
  const browser = getBrowser(userAgent);
  const operatingSystem = getOperatingSystem(userAgent);
  const deviceType = getDeviceType(userAgent);
  const deviceName = `${browser} on ${operatingSystem}`;

  return {
    browser,
    operatingSystem,
    deviceType,
    deviceName
  };
}

function getBrowser(userAgent: string) {
  if (/Edg\//i.test(userAgent)) {
    return "Microsoft Edge";
  }

  if (/OPR\//i.test(userAgent)) {
    return "Opera";
  }

  if (/Firefox\//i.test(userAgent)) {
    return "Firefox";
  }

  if (/Chrome\//i.test(userAgent) || /CriOS\//i.test(userAgent)) {
    return "Chrome";
  }

  if (/Safari\//i.test(userAgent)) {
    return "Safari";
  }

  return "Unknown browser";
}

function getOperatingSystem(userAgent: string) {
  if (/iPad|iPhone|iPod/i.test(userAgent)) {
    return "iOS";
  }

  if (/Android/i.test(userAgent)) {
    return "Android";
  }

  if (/Mac OS X|Macintosh/i.test(userAgent)) {
    return "macOS";
  }

  if (/Windows NT/i.test(userAgent)) {
    return "Windows";
  }

  if (/Linux/i.test(userAgent)) {
    return "Linux";
  }

  return "Unknown OS";
}

function getDeviceType(userAgent: string) {
  if (/iPad|Tablet/i.test(userAgent)) {
    return "Tablet";
  }

  if (/Mobile|iPhone|Android/i.test(userAgent)) {
    return "Mobile";
  }

  return "Desktop";
}
