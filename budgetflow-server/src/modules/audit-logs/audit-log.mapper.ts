import type { AuditLogDetailRecord, AuditLogSummaryRecord } from "./audit-log.repository";

export function toAuditLogSummaryResponse(auditLog: AuditLogSummaryRecord) {
  return {
    id: auditLog.id,
    action: auditLog.action,
    entityType: auditLog.entityType,
    entityId: auditLog.entityId,
    result: auditLog.result,
    severity: auditLog.severity,
    ipAddress: auditLog.ipAddress,
    browser: auditLog.browser,
    operatingSystem: auditLog.operatingSystem,
    deviceType: auditLog.deviceType,
    sessionId: auditLog.sessionId,
    createdAt: auditLog.createdAt
  };
}

export function toAuditLogDetailResponse(auditLog: AuditLogDetailRecord) {
  return {
    ...toAuditLogSummaryResponse(auditLog),
    userAgent: auditLog.userAgent,
    requestId: auditLog.requestId,
    correlationId: auditLog.correlationId,
    beforeSnapshot: auditLog.beforeSnapshot,
    afterSnapshot: auditLog.afterSnapshot,
    metadata: auditLog.metadata,
    errorMessage: auditLog.errorMessage
  };
}
