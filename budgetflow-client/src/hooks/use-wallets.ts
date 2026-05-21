"use client";

import { useCallback, useEffect, useState } from "react";

import { walletsApi, type WalletInput } from "@/lib/api/wallets.api";
import { getFriendlyApiError } from "@/lib/api/http";
import type { Wallet } from "@/types/api";

export function useWallets() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadWallets = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await walletsApi.list();
      setWallets(response.data.wallets);
    } catch (error) {
      setErrorMessage(getFriendlyApiError(error, "loadWallets"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWallets();
  }, [loadWallets]);

  const createWallet = useCallback(
    async (input: WalletInput) => {
      const response = await walletsApi.create(input);
      await loadWallets();
      return response.data.wallet;
    },
    [loadWallets]
  );

  const updateWallet = useCallback(
    async (id: string, input: WalletInput) => {
      const response = await walletsApi.update(id, input);
      await loadWallets();
      return response.data.wallet;
    },
    [loadWallets]
  );

  const deleteWallet = useCallback(
    async (id: string) => {
      await walletsApi.delete(id);
      await loadWallets();
    },
    [loadWallets]
  );

  return {
    wallets,
    isLoading,
    errorMessage,
    reload: loadWallets,
    createWallet,
    updateWallet,
    deleteWallet
  };
}
