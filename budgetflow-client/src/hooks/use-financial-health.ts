"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { financialHealthApi, type FinancialHealthFilters } from "@/lib/api/financial-health.api";
import { getFriendlyApiError } from "@/lib/api/http";
import { subscribeToTransactionsChanged } from "@/lib/events";
import type { FinancialHealth } from "@/types/api";

export function useFinancialHealth(filters: FinancialHealthFilters = {}) {
  const [financialHealth, setFinancialHealth] = useState<FinancialHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);
  const requestFilters = useMemo(() => JSON.parse(filterKey) as FinancialHealthFilters, [filterKey]);

  const loadFinancialHealth = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setFinancialHealth(null);

    try {
      const response = await financialHealthApi.get(requestFilters);
      setFinancialHealth(response.data.financialHealth);
    } catch (error) {
      setErrorMessage(getFriendlyApiError(error, "loadFinancialHealth"));
    } finally {
      setIsLoading(false);
    }
  }, [requestFilters]);

  useEffect(() => {
    void loadFinancialHealth();
  }, [loadFinancialHealth]);

  useEffect(() => subscribeToTransactionsChanged(() => void loadFinancialHealth()), [loadFinancialHealth]);

  return {
    errorMessage,
    financialHealth,
    isLoading,
    reload: loadFinancialHealth
  };
}
