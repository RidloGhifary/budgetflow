import { apiRequest } from "@/lib/api/http";
import type { ApiEnvelope, Wallet, WalletType } from "@/types/api";

export interface WalletInput {
  name: string;
  type: WalletType;
  initialBalance: number;
}

export const walletsApi = {
  list() {
    return apiRequest<ApiEnvelope<{ wallets: Wallet[] }>>("/wallets");
  },

  create(input: WalletInput) {
    return apiRequest<ApiEnvelope<{ wallet: Wallet }>>("/wallets", {
      method: "POST",
      body: input
    });
  },

  update(id: string, input: WalletInput) {
    return apiRequest<ApiEnvelope<{ wallet: Wallet }>>(`/wallets/${id}`, {
      method: "PATCH",
      body: input
    });
  },

  delete(id: string) {
    return apiRequest<ApiEnvelope<null>>(`/wallets/${id}`, {
      method: "DELETE"
    });
  }
};
