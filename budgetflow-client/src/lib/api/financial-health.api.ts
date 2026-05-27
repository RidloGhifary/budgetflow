import { apiRequest } from "@/lib/api/http";
import type { ApiEnvelope, FinancialHealth } from "@/types/api";

export interface FinancialHealthFilters {
  compareEndDate?: string;
  compareStartDate?: string;
  endDate?: string;
  startDate?: string;
}

function buildQueryString(filters: FinancialHealthFilters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });

  const queryString = params.toString();

  return queryString ? `?${queryString}` : "";
}

export const financialHealthApi = {
  get(filters: FinancialHealthFilters = {}) {
    return apiRequest<ApiEnvelope<{ financialHealth: FinancialHealth }>>(`/financial-health${buildQueryString(filters)}`);
  }
};
