"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { debtsApi, type DebtFilters, type DebtInput, type DebtPaymentInput } from "@/lib/api/debts.api";
import { getFriendlyApiError } from "@/lib/api/http";
import type { Debt, DebtDetail, DebtSummary } from "@/types/api";

export function useDebts(filters: DebtFilters) {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);

  const loadDebts = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await debtsApi.list(filters);
      setDebts(response.data.debts);
    } catch (error) {
      setErrorMessage(getFriendlyApiError(error, "loadDebts"));
    } finally {
      setIsLoading(false);
    }
  }, [filterKey, filters]);

  useEffect(() => {
    void loadDebts();
  }, [loadDebts]);

  const createDebt = useCallback(
    async (input: DebtInput) => {
      const response = await debtsApi.create(input);
      await loadDebts();
      return response.data.debt;
    },
    [loadDebts]
  );

  const updateDebt = useCallback(
    async (id: string, input: DebtInput) => {
      const response = await debtsApi.update(id, input);
      await loadDebts();
      return response.data.debt;
    },
    [loadDebts]
  );

  const deleteDebt = useCallback(
    async (id: string) => {
      await debtsApi.delete(id);
      await loadDebts();
    },
    [loadDebts]
  );

  const recordPayment = useCallback(
    async (id: string, input: DebtPaymentInput) => {
      const response = await debtsApi.recordPayment(id, input);
      await loadDebts();
      return response.data;
    },
    [loadDebts]
  );

  return {
    debts,
    isLoading,
    errorMessage,
    reload: loadDebts,
    createDebt,
    updateDebt,
    deleteDebt,
    recordPayment
  };
}

export function useDebtSummary() {
  const [summary, setSummary] = useState<DebtSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await debtsApi.summary();
      setSummary(response.data.summary);
    } catch (error) {
      setErrorMessage(getFriendlyApiError(error, "loadDebts"));
    } finally {
      setIsLoading(false);
    }
  }, []);

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

export function useDebtDetail(debtId: string | null) {
  const [debt, setDebt] = useState<DebtDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadDebt = useCallback(async () => {
    if (!debtId) {
      setDebt(null);
      setErrorMessage(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await debtsApi.get(debtId);
      setDebt(response.data.debt);
    } catch (error) {
      setDebt(null);
      setErrorMessage(getFriendlyApiError(error, "loadDebts"));
    } finally {
      setIsLoading(false);
    }
  }, [debtId]);

  useEffect(() => {
    void loadDebt();
  }, [loadDebt]);

  return {
    debt,
    isLoading,
    errorMessage,
    reload: loadDebt
  };
}
