"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  dataExportsApi,
  type CreateDataExportInput,
  type DataExportListFilters
} from "@/lib/api/data-exports.api";
import { getFriendlyApiError } from "@/lib/api/http";
import type { DataExport, PaginationMeta } from "@/types/api";

const emptyPagination: PaginationMeta = {
  page: 1,
  pageSize: 10,
  totalItems: 0,
  totalPages: 1
};

export function useDataExports(filters: DataExportListFilters) {
  const [exports, setExports] = useState<DataExport[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>(emptyPagination);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);
  const requestFilters = useMemo(() => JSON.parse(filterKey) as DataExportListFilters, [filterKey]);

  const loadExports = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await dataExportsApi.list(requestFilters);
      setExports(response.data.exports);
      setPagination(response.data.pagination);
    } catch (error) {
      setErrorMessage(getFriendlyApiError(error, "loadExports"));
    } finally {
      setIsLoading(false);
    }
  }, [requestFilters]);

  useEffect(() => {
    void loadExports();
  }, [loadExports]);

  useEffect(() => {
    const hasActiveExport = exports.some((dataExport) => dataExport.status === "PENDING" || dataExport.status === "PROCESSING");

    if (!hasActiveExport) {
      return;
    }

    const timer = window.setInterval(() => {
      void loadExports();
    }, 5000);

    return () => window.clearInterval(timer);
  }, [exports, loadExports]);

  const createExport = useCallback(
    async (input: CreateDataExportInput) => {
      const response = await dataExportsApi.create(input);
      await loadExports();
      return response.data.export;
    },
    [loadExports]
  );

  const downloadExport = useCallback(async (id: string) => dataExportsApi.download(id), []);

  return {
    createExport,
    downloadExport,
    errorMessage,
    exports,
    isLoading,
    pagination,
    reload: loadExports
  };
}
