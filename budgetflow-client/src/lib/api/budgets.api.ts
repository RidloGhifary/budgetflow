import { apiRequest } from "@/lib/api/http";
import type { ApiEnvelope, Budget, BudgetSummary } from "@/types/api";

export interface BudgetFilters {
  categoryId?: string;
  month?: number | string;
  year?: number | string;
}

export interface BudgetInput {
  categoryId: string;
  month: number;
  year: number;
  limitAmount: number;
}

function buildQueryString(filters: BudgetFilters) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });

  const queryString = params.toString();

  return queryString ? `?${queryString}` : "";
}

export const budgetsApi = {
  list(filters: BudgetFilters = {}) {
    return apiRequest<ApiEnvelope<{ budgets: Budget[] }>>(`/budgets${buildQueryString(filters)}`);
  },

  get(id: string) {
    return apiRequest<ApiEnvelope<{ budget: Budget }>>(`/budgets/${id}`);
  },

  summary(filters: Pick<BudgetFilters, "month" | "year">) {
    return apiRequest<ApiEnvelope<{ summary: BudgetSummary }>>(`/budgets/summary${buildQueryString(filters)}`);
  },

  create(input: BudgetInput) {
    return apiRequest<ApiEnvelope<{ budget: Budget }>>("/budgets", {
      method: "POST",
      body: input
    });
  },

  update(id: string, input: BudgetInput) {
    return apiRequest<ApiEnvelope<{ budget: Budget }>>(`/budgets/${id}`, {
      method: "PATCH",
      body: input
    });
  },

  delete(id: string) {
    return apiRequest<ApiEnvelope<null>>(`/budgets/${id}`, {
      method: "DELETE"
    });
  }
};
