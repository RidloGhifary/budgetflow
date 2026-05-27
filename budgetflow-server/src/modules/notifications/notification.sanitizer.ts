import { sanitizeAuditPayload } from "../audit-logs/audit-log.sanitizer";

export function sanitizeNotificationMetadata(value: unknown) {
  return sanitizeAuditPayload(value);
}
