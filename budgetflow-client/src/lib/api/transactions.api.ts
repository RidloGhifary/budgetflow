import { apiRequest } from "@/lib/api/http";
import type { ApiEnvelope, Transaction, TransactionPurpose, TransactionType } from "@/types/api";

export interface TransactionFilters {
  type?: TransactionType | "";
  purpose?: TransactionPurpose | "";
  walletId?: string;
  categoryId?: string;
  month?: string;
  year?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface TransactionInput {
  walletId: string;
  categoryId: string;
  type: TransactionType;
  purpose: TransactionPurpose;
  amount: number;
  transactionDate: string;
  note?: string | null;
}

function buildQueryString(filters: TransactionFilters) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, value);
    }
  });

  const queryString = params.toString();

  return queryString ? `?${queryString}` : "";
}

export const transactionsApi = {
  list(filters: TransactionFilters = {}) {
    return apiRequest<ApiEnvelope<{ transactions: Transaction[] }>>(`/transactions${buildQueryString(filters)}`);
  },

  get(id: string) {
    return apiRequest<ApiEnvelope<{ transaction: Transaction }>>(`/transactions/${id}`);
  },

  create(input: TransactionInput) {
    return apiRequest<ApiEnvelope<{ transaction: Transaction }>>("/transactions", {
      method: "POST",
      body: input
    });
  },

  update(id: string, input: TransactionInput) {
    return apiRequest<ApiEnvelope<{ transaction: Transaction }>>(`/transactions/${id}`, {
      method: "PATCH",
      body: input
    });
  },

  delete(id: string) {
    return apiRequest<ApiEnvelope<null>>(`/transactions/${id}`, {
      method: "DELETE"
    });
  }
};
