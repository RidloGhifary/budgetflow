"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  recurringTransactionsApi,
  type RecurringTransactionFilters,
  type RecurringTransactionInput
} from "@/lib/api/recurring-transactions.api";
import { getFriendlyApiError } from "@/lib/api/http";
import type { RecurringTransaction, RecurringTransactionDetail } from "@/types/api";

export function useRecurringTransactions(filters: RecurringTransactionFilters) {
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);

  const loadRecurringTransactions = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await recurringTransactionsApi.list(filters);
      setRecurringTransactions(response.data.recurringTransactions);
    } catch (error) {
      setErrorMessage(getFriendlyApiError(error, "loadRecurringTransactions"));
    } finally {
      setIsLoading(false);
    }
  }, [filterKey, filters]);

  useEffect(() => {
    void loadRecurringTransactions();
  }, [loadRecurringTransactions]);

  const createRecurringTransaction = useCallback(
    async (input: RecurringTransactionInput) => {
      const response = await recurringTransactionsApi.create(input);
      await loadRecurringTransactions();
      return response.data.recurringTransaction;
    },
    [loadRecurringTransactions]
  );

  const updateRecurringTransaction = useCallback(
    async (id: string, input: Partial<RecurringTransactionInput>) => {
      const response = await recurringTransactionsApi.update(id, input);
      await loadRecurringTransactions();
      return response.data.recurringTransaction;
    },
    [loadRecurringTransactions]
  );

  const pauseRecurringTransaction = useCallback(
    async (id: string) => {
      const response = await recurringTransactionsApi.pause(id);
      await loadRecurringTransactions();
      return response.data.recurringTransaction;
    },
    [loadRecurringTransactions]
  );

  const resumeRecurringTransaction = useCallback(
    async (id: string) => {
      const response = await recurringTransactionsApi.resume(id);
      await loadRecurringTransactions();
      return response.data.recurringTransaction;
    },
    [loadRecurringTransactions]
  );

  const cancelRecurringTransaction = useCallback(
    async (id: string) => {
      const response = await recurringTransactionsApi.cancel(id);
      await loadRecurringTransactions();
      return response.data.recurringTransaction;
    },
    [loadRecurringTransactions]
  );

  const generateRecurringTransaction = useCallback(
    async (id: string) => {
      const response = await recurringTransactionsApi.generate(id);
      await loadRecurringTransactions();
      return response.data;
    },
    [loadRecurringTransactions]
  );

  const generateDueRecurringTransactions = useCallback(async () => {
    const response = await recurringTransactionsApi.generateDue();
    await loadRecurringTransactions();
    return response.data;
  }, [loadRecurringTransactions]);

  return {
    recurringTransactions,
    isLoading,
    errorMessage,
    reload: loadRecurringTransactions,
    createRecurringTransaction,
    updateRecurringTransaction,
    pauseRecurringTransaction,
    resumeRecurringTransaction,
    cancelRecurringTransaction,
    generateRecurringTransaction,
    generateDueRecurringTransactions
  };
}

export function useRecurringTransactionDetail(id: string | null) {
  const [recurringTransaction, setRecurringTransaction] = useState<RecurringTransactionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadRecurringTransaction = useCallback(async () => {
    if (!id) {
      setRecurringTransaction(null);
      setErrorMessage(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await recurringTransactionsApi.get(id);
      setRecurringTransaction(response.data.recurringTransaction);
    } catch (error) {
      setErrorMessage(getFriendlyApiError(error, "loadRecurringTransactions"));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadRecurringTransaction();
  }, [loadRecurringTransaction]);

  return {
    recurringTransaction,
    isLoading,
    errorMessage,
    reload: loadRecurringTransaction
  };
}
