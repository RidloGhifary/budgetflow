"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { dashboardApi, type DashboardSummaryFilters } from "@/lib/api/dashboard.api";
import { getFriendlyApiError } from "@/lib/api/http";
import { subscribeToTransactionsChanged } from "@/lib/events";
import type { DashboardSummary } from "@/types/api";

export function useDashboardSummary(filters: DashboardSummaryFilters) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);

  const loadSummary = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSummary(null);

    try {
      const response = await dashboardApi.summary(filters);
      setSummary(response.data.summary);
    } catch (error) {
      setErrorMessage(getFriendlyApiError(error, "loadDashboard"));
    } finally {
      setIsLoading(false);
    }
  }, [filterKey, filters]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => subscribeToTransactionsChanged(() => void loadSummary()), [loadSummary]);

  return {
    summary,
    isLoading,
    errorMessage,
    reload: loadSummary
  };
}
