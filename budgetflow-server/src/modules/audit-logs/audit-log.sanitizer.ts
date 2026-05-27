import { Prisma } from "@prisma/client";

const sensitiveKeyPattern = /(password|token|secret|authorization|cookie|apikey|api_key|privatekey|private_key|refreshtoken|refresh_token|accesstoken|access_token|otp|pin)/i;
const maxDepth = 6;
const maxStringLength = 1000;

export type SanitizedAuditPayload = Prisma.InputJsonValue | null;

export function sanitizeAuditPayload(value: unknown, depth = 0): SanitizedAuditPayload {
  if (value === null || value === undefined) {
    return null;
  }

  if (depth > maxDepth) {
    return "[Max depth reached]";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    return value.slice(0, maxStringLength);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuditPayload(item, depth + 1)) as Prisma.InputJsonArray;
  }

  if (typeof value === "object") {
    if (isDecimalLike(value)) {
      return value.toNumber();
    }

    const entries = Object.entries(value).map(([key, entryValue]) => {
      if (sensitiveKeyPattern.test(key)) {
        return [key, "[REDACTED]"];
      }

      return [key, sanitizeAuditPayload(entryValue, depth + 1)];
    });

    return Object.fromEntries(entries) as Prisma.InputJsonObject;
  }

  return String(value);
}

export function pickAuditFields<T extends Record<string, unknown>>(value: T, fields: string[]) {
  return fields.reduce<Record<string, unknown>>((snapshot, field) => {
    if (field in value) {
      snapshot[field] = value[field];
    }

    return snapshot;
  }, {});
}

export function getChangedFields(before: Record<string, unknown>, after: Record<string, unknown>) {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);

  return Array.from(keys).filter((key) => normalizeComparable(before[key]) !== normalizeComparable(after[key]));
}

function normalizeComparable(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (isDecimalLike(value)) {
    return String(value);
  }

  return JSON.stringify(value ?? null);
}

function isDecimalLike(value: unknown): value is { toNumber: () => number } {
  return typeof value === "object" && value !== null && "toNumber" in value && typeof value.toNumber === "function";
}
