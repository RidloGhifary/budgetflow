"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { dataImportsApi, type DataImportPreviewFilters } from "@/lib/api/data-imports.api";
import { getFriendlyApiError } from "@/lib/api/http";
import type { DataImport, DataImportRow, DataImportRowStatus, PaginationMeta } from "@/types/api";

const defaultImportsPagination: PaginationMeta = {
  page: 1,
  pageSize: 10,
  totalItems: 0,
  totalPages: 1
};

const defaultRowsPagination: PaginationMeta = {
  page: 1,
  pageSize: 20,
  totalItems: 0,
  totalPages: 1
};

export function useDataImports(selectedImportId?: string | null) {
  const [imports, setImports] = useState<DataImport[]>([]);
  const [importsPagination, setImportsPagination] = useState(defaultImportsPagination);
  const [importsPage, setImportsPage] = useState(1);
  const [importsPageSize, setImportsPageSize] = useState(10);
  const [selectedImport, setSelectedImport] = useState<DataImport | null>(null);
  const [rows, setRows] = useState<DataImportRow[]>([]);
  const [rowsPagination, setRowsPagination] = useState(defaultRowsPagination);
  const [rowsPage, setRowsPage] = useState(1);
  const [rowsPageSize, setRowsPageSize] = useState(20);
  const [rowStatus, setRowStatus] = useState<DataImportRowStatus | "">("");
  const [isLoadingImports, setIsLoadingImports] = useState(true);
  const [isLoadingRows, setIsLoadingRows] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadImports = useCallback(async () => {
    setIsLoadingImports(true);
    setErrorMessage(null);

    try {
      const response = await dataImportsApi.list({ page: importsPage, pageSize: importsPageSize });
      const nextImports = response.data?.imports ?? [];

      setImports(nextImports);
      setImportsPagination(response.data?.pagination ?? defaultImportsPagination);
      setSelectedImport((currentImport) => {
        if (selectedImportId) {
          return currentImport;
        }

        if (currentImport) {
          return nextImports.find((dataImport) => dataImport.id === currentImport.id) ?? currentImport;
        }

        return nextImports[0] ?? null;
      });
    } catch (error) {
      setErrorMessage(getFriendlyApiError(error, "loadImports"));
    } finally {
      setIsLoadingImports(false);
    }
  }, [importsPage, importsPageSize, selectedImportId]);

  const loadSelectedImport = useCallback(async () => {
    if (!selectedImportId) {
      return;
    }

    try {
      const response = await dataImportsApi.get(selectedImportId);
      setSelectedImport(response.data?.import ?? null);
    } catch (error) {
      setErrorMessage(getFriendlyApiError(error, "loadImports"));
    }
  }, [selectedImportId]);

  const loadRows = useCallback(async () => {
    const importId = selectedImportId ?? selectedImport?.id;

    if (!importId) {
      setRows([]);
      setRowsPagination(defaultRowsPagination);
      return;
    }

    setIsLoadingRows(true);

    try {
      const filters: DataImportPreviewFilters = {
        page: rowsPage,
        pageSize: rowsPageSize,
        status: rowStatus
      };
      const response = await dataImportsApi.previewRows(importId, filters);

      setRows(response.data?.rows ?? []);
      setRowsPagination(response.data?.pagination ?? defaultRowsPagination);
    } catch (error) {
      setErrorMessage(getFriendlyApiError(error, "loadImports"));
    } finally {
      setIsLoadingRows(false);
    }
  }, [rowStatus, rowsPage, rowsPageSize, selectedImport, selectedImportId]);

  useEffect(() => {
    void loadImports();
  }, [loadImports]);

  useEffect(() => {
    void loadSelectedImport();
  }, [loadSelectedImport]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const isProcessing = selectedImport?.status === "PROCESSING" || selectedImport?.status === "PARSING";

  useEffect(() => {
    if (!isProcessing) {
      return;
    }

    const interval = window.setInterval(() => {
      void loadImports();
      void loadSelectedImport();
      void loadRows();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [isProcessing, loadImports, loadRows, loadSelectedImport]);

  const uploadImport = useCallback(async (file: File) => {
    const response = await dataImportsApi.uploadTransactions(file);
    const dataImport = response.data?.import ?? null;

    if (dataImport) {
      setSelectedImport(dataImport);
      setRowsPage(1);
      setRowStatus("");
    }

    await loadImports();

    return dataImport;
  }, [loadImports]);

  const confirmImport = useCallback(
    async (id: string, includeDuplicates: boolean) => {
      const response = await dataImportsApi.confirm(id, { includeDuplicates });
      const dataImport = response.data?.import ?? null;

      if (dataImport) {
        setSelectedImport(dataImport);
      }

      await loadImports();

      return dataImport;
    },
    [loadImports]
  );

  const cancelImport = useCallback(
    async (id: string) => {
      await dataImportsApi.cancel(id);
      await loadImports();

      if (selectedImport?.id === id) {
        const response = await dataImportsApi.get(id);
        setSelectedImport(response.data?.import ?? null);
      }
    },
    [loadImports, selectedImport]
  );

  const selectImport = useCallback((dataImport: DataImport) => {
    setSelectedImport(dataImport);
    setRowsPage(1);
  }, []);

  const selectedProgress = useMemo(() => selectedImport?.job?.progress ?? 0, [selectedImport]);

  return {
    cancelImport,
    confirmImport,
    errorMessage,
    imports,
    importsPagination,
    isLoadingImports,
    isLoadingRows,
    loadImports,
    loadRows,
    rowStatus,
    rows,
    rowsPage,
    rowsPagination,
    selectedImport,
    selectedProgress,
    selectImport,
    setImportsPage,
    setImportsPageSize: (pageSize: number) => {
      setImportsPageSize(pageSize);
      setImportsPage(1);
    },
    setRowStatus: (status: DataImportRowStatus | "") => {
      setRowStatus(status);
      setRowsPage(1);
    },
    setRowsPage,
    setRowsPageSize: (pageSize: number) => {
      setRowsPageSize(pageSize);
      setRowsPage(1);
    },
    uploadImport
  };
}
