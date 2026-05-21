import { apiRequest } from "@/lib/api/http";
import type { ApiEnvelope, Debt, DebtDetail, DebtStatus, DebtSummary, DebtType, DebtPayment } from "@/types/api";

export interface DebtFilters {
  type?: DebtType | "";
  status?: DebtStatus | "";
  search?: string;
  dueBefore?: string;
  dueAfter?: string;
}

export interface DebtInput {
  type: DebtType;
  title: string;
  personName: string;
  totalAmount: number;
  dueDate?: string | null;
  note?: string | null;
}

export interface DebtPaymentInput {
  amount: number;
  walletId: string;
  categoryId: string;
  paymentDate: string;
  note?: string | null;
}

function buildQueryString(filters: DebtFilters) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });

  const queryString = params.toString();

  return queryString ? `?${queryString}` : "";
}

export const debtsApi = {
  list(filters: DebtFilters = {}) {
    return apiRequest<ApiEnvelope<{ debts: Debt[] }>>(`/debts${buildQueryString(filters)}`);
  },

  get(id: string) {
    return apiRequest<ApiEnvelope<{ debt: DebtDetail }>>(`/debts/${id}`);
  },

  summary() {
    return apiRequest<ApiEnvelope<{ summary: DebtSummary }>>("/debts/summary");
  },

  create(input: DebtInput) {
    return apiRequest<ApiEnvelope<{ debt: Debt }>>("/debts", {
      method: "POST",
      body: input
    });
  },

  update(id: string, input: DebtInput) {
    return apiRequest<ApiEnvelope<{ debt: Debt }>>(`/debts/${id}`, {
      method: "PATCH",
      body: input
    });
  },

  delete(id: string) {
    return apiRequest<ApiEnvelope<null>>(`/debts/${id}`, {
      method: "DELETE"
    });
  },

  recordPayment(id: string, input: DebtPaymentInput) {
    return apiRequest<ApiEnvelope<{ debt: Debt; payment: DebtPayment }>>(`/debts/${id}/payments`, {
      method: "POST",
      body: input
    });
  }
};
