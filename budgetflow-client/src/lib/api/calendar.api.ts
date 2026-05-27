import { apiRequest } from "@/lib/api/http";
import type {
  ApiEnvelope,
  CalendarDayDetail,
  CalendarSummary,
  PaginationMeta,
  TransactionType
} from "@/types/api";

export interface CalendarFilters {
  categoryId?: string;
  includeRecurring?: boolean;
  type?: TransactionType | "";
  walletId?: string;
}

export interface CalendarSummaryFilters extends CalendarFilters {
  endDate: string;
  startDate: string;
}

export interface CalendarDayFilters extends CalendarFilters {
  date: string;
  page: number;
  pageSize: number;
}

function buildQueryString(filters: CalendarDayFilters | CalendarSummaryFilters) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });

  const queryString = params.toString();

  return queryString ? `?${queryString}` : "";
}

export const calendarApi = {
  summary(filters: CalendarSummaryFilters) {
    return apiRequest<ApiEnvelope<{ calendar: CalendarSummary }>>(`/calendar/summary${buildQueryString(filters)}`);
  },

  day(filters: CalendarDayFilters) {
    return apiRequest<
      ApiEnvelope<{
        day: CalendarDayDetail & {
          pagination: PaginationMeta;
        };
      }>
    >(`/calendar/day${buildQueryString(filters)}`);
  }
};
