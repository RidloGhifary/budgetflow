import { apiRequest } from "@/lib/api/http";
import type { ApiEnvelope, DashboardSummary } from "@/types/api";

export interface DashboardSummaryFilters {
  month: number | string;
  year: number | string;
}

function buildQueryString(filters: DashboardSummaryFilters) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });

  const queryString = params.toString();

  return queryString ? `?${queryString}` : "";
}

export const dashboardApi = {
  summary(filters: DashboardSummaryFilters) {
    return apiRequest<ApiEnvelope<{ summary: DashboardSummary }>>(`/dashboard/summary${buildQueryString(filters)}`);
  }
};
