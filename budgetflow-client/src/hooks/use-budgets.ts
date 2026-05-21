"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { budgetsApi, type BudgetFilters, type BudgetInput } from "@/lib/api/budgets.api";
import { getFriendlyApiError } from "@/lib/api/http";
import type { Budget, BudgetSummary } from "@/types/api";

export function useBudgets(filters: BudgetFilters) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);

  const loadBudgets = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await budgetsApi.list(filters);
      setBudgets(response.data.budgets);
    } catch (error) {
      setErrorMessage(getFriendlyApiError(error, "loadBudgets"));
    } finally {
      setIsLoading(false);
    }
  }, [filterKey, filters]);

  useEffect(() => {
    void loadBudgets();
  }, [loadBudgets]);

  const createBudget = useCallback(
    async (input: BudgetInput) => {
      const response = await budgetsApi.create(input);
      await loadBudgets();
      return response.data.budget;
    },
    [loadBudgets]
  );

  const updateBudget = useCallback(
    async (id: string, input: BudgetInput) => {
      const response = await budgetsApi.update(id, input);
      await loadBudgets();
      return response.data.budget;
    },
    [loadBudgets]
  );

  const deleteBudget = useCallback(
    async (id: string) => {
      await budgetsApi.delete(id);
      await loadBudgets();
    },
    [loadBudgets]
  );

  return {
    budgets,
    isLoading,
    errorMessage,
    reload: loadBudgets,
    createBudget,
    updateBudget,
    deleteBudget
  };
}

export function useBudgetSummary(filters: Pick<BudgetFilters, "month" | "year">) {
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);

  const loadSummary = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSummary(null);

    try {
      const response = await budgetsApi.summary(filters);
      setSummary(response.data.summary);
    } catch (error) {
      setErrorMessage(getFriendlyApiError(error, "loadBudgets"));
    } finally {
      setIsLoading(false);
    }
  }, [filterKey, filters]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  return {
    summary,
    isLoading,
    errorMessage,
    reload: loadSummary
  };
}
