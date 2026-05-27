"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { auditLogsApi, type AuditLogFilters } from "@/lib/api/audit-logs.api";
import { getFriendlyApiError } from "@/lib/api/http";
import type { AuditLogDetail, AuditLogSummary, PaginationMeta } from "@/types/api";

const emptyPagination: PaginationMeta = {
  page: 1,
  pageSize: 10,
  totalItems: 0,
  totalPages: 1
};

export function useAuditLogs(filters: AuditLogFilters) {
  const [auditLogs, setAuditLogs] = useState<AuditLogSummary[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>(emptyPagination);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);

  const loadAuditLogs = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await auditLogsApi.list(filters);
      setAuditLogs(response.data.auditLogs);
      setPagination(response.data.pagination);
    } catch (error) {
      setErrorMessage(getFriendlyApiError(error, "loadAuditLogs"));
    } finally {
      setIsLoading(false);
    }
  }, [filterKey, filters]);

  useEffect(() => {
    void loadAuditLogs();
  }, [loadAuditLogs]);

  return {
    auditLogs,
    errorMessage,
    isLoading,
    pagination,
    reload: loadAuditLogs
  };
}

export function useAuditLogDetail(id: string | null) {
  const [auditLog, setAuditLog] = useState<AuditLogDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadAuditLog = useCallback(async () => {
    if (!id) {
      setAuditLog(null);
      setErrorMessage(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await auditLogsApi.get(id);
      setAuditLog(response.data.auditLog);
    } catch (error) {
      setErrorMessage(getFriendlyApiError(error, "loadAuditLogs"));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadAuditLog();
  }, [loadAuditLog]);

  return {
    auditLog,
    errorMessage,
    isLoading,
    reload: loadAuditLog
  };
}
