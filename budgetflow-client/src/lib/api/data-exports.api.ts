import { apiFileRequest, apiRequest } from "@/lib/api/http";
import type {
  ApiEnvelope,
  DataExport,
  DataExportFormat,
  DataExportStatus,
  DataExportType,
  PaginationMeta,
  TransactionType
} from "@/types/api";

export interface DataExportFilters {
  categoryId?: string;
  endDate?: string;
  search?: string;
  startDate?: string;
  type?: TransactionType | "";
  walletId?: string;
}

export interface CreateDataExportInput {
  exportType: DataExportType;
  filters: DataExportFilters;
  format: DataExportFormat;
}

export interface DataExportListFilters {
  exportType?: DataExportType | "";
  format?: DataExportFormat | "";
  page: number;
  pageSize: number;
  status?: DataExportStatus | "";
}

function buildQueryString(filters: DataExportListFilters) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });

  const queryString = params.toString();

  return queryString ? `?${queryString}` : "";
}

export const dataExportsApi = {
  create(input: CreateDataExportInput) {
    return apiRequest<ApiEnvelope<{ export: DataExport }>>("/data-exports", {
      body: input,
      method: "POST"
    });
  },

  list(filters: DataExportListFilters) {
    return apiRequest<
      ApiEnvelope<{
        exports: DataExport[];
        pagination: PaginationMeta;
      }>
    >(`/data-exports${buildQueryString(filters)}`);
  },

  get(id: string) {
    return apiRequest<ApiEnvelope<{ export: DataExport }>>(`/data-exports/${id}`);
  },

  download(id: string) {
    return apiFileRequest(`/data-exports/${id}/download`);
  }
};
