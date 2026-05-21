"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { transactionsApi, type TransactionFilters, type TransactionInput } from "@/lib/api/transactions.api";
import { getFriendlyApiError } from "@/lib/api/http";
import type { Transaction } from "@/types/api";

export function useTransactions(filters: TransactionFilters) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);

  const loadTransactions = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await transactionsApi.list(filters);
      setTransactions(response.data.transactions);
    } catch (error) {
      setErrorMessage(getFriendlyApiError(error, "loadTransactions"));
    } finally {
      setIsLoading(false);
    }
  }, [filterKey, filters]);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  const createTransaction = useCallback(
    async (input: TransactionInput) => {
      const response = await transactionsApi.create(input);
      await loadTransactions();
      return response.data.transaction;
    },
    [loadTransactions]
  );

  const updateTransaction = useCallback(
    async (id: string, input: TransactionInput) => {
      const response = await transactionsApi.update(id, input);
      await loadTransactions();
      return response.data.transaction;
    },
    [loadTransactions]
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      await transactionsApi.delete(id);
      await loadTransactions();
    },
    [loadTransactions]
  );

  return {
    transactions,
    isLoading,
    errorMessage,
    reload: loadTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction
  };
}
