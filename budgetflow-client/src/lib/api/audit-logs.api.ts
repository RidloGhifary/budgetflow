import { apiRequest } from "@/lib/api/http";
import type {
  ApiEnvelope,
  AuditLogDetail,
  AuditLogResult,
  AuditLogSeverity,
  AuditLogSummary,
  PaginationMeta
} from "@/types/api";

export interface AuditLogFilters {
  action?: string;
  endDate?: string;
  entityId?: string;
  entityType?: string;
  page: number;
  pageSize: number;
  result?: AuditLogResult | "";
  search?: string;
  severity?: AuditLogSeverity | "";
  startDate?: string;
}

function buildQueryString(filters: AuditLogFilters) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });

  const queryString = params.toString();

  return queryString ? `?${queryString}` : "";
}

export const auditLogsApi = {
  list(filters: AuditLogFilters) {
    return apiRequest<
      ApiEnvelope<{
        auditLogs: AuditLogSummary[];
        pagination: PaginationMeta;
      }>
    >(`/audit-logs${buildQueryString(filters)}`);
  },

  get(id: string) {
    return apiRequest<ApiEnvelope<{ auditLog: AuditLogDetail }>>(`/audit-logs/${id}`);
  }
};
