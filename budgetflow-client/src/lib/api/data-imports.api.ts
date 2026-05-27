import { apiRawRequest, apiRequest } from "@/lib/api/http";
import type {
  ApiEnvelope,
  DataImport,
  DataImportFormat,
  DataImportRow,
  DataImportRowStatus,
  DataImportStatus,
  DataImportType,
  PaginationMeta
} from "@/types/api";

export interface DataImportListFilters {
  format?: DataImportFormat | "";
  importType?: DataImportType | "";
  page?: number;
  pageSize?: number;
  status?: DataImportStatus | "";
}

export interface DataImportPreviewFilters {
  page?: number;
  pageSize?: number;
  status?: DataImportRowStatus | "";
}

export interface ConfirmDataImportInput {
  includeDuplicates: boolean;
}

function buildQueryString(filters: object) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (typeof value === "string" || typeof value === "number") {
      if (value === "") {
        return;
      }
      params.set(key, String(value));
    }
  });

  const queryString = params.toString();

  return queryString ? `?${queryString}` : "";
}

export const dataImportsApi = {
  async uploadTransactions(file: File) {
    const buffer = await file.arrayBuffer();

    return apiRawRequest<ApiEnvelope<{ import: DataImport }>>("/data-imports", {
      body: buffer,
      headers: {
        "Content-Type": file.type || inferContentType(file.name),
        "X-File-Name": file.name,
        "X-Import-Type": "TRANSACTIONS"
      },
      method: "POST"
    });
  },

  list(filters: DataImportListFilters = {}) {
    return apiRequest<ApiEnvelope<{ imports: DataImport[]; pagination: PaginationMeta }>>(
      `/data-imports${buildQueryString(filters)}`
    );
  },

  get(id: string) {
    return apiRequest<ApiEnvelope<{ import: DataImport }>>(`/data-imports/${id}`);
  },

  previewRows(id: string, filters: DataImportPreviewFilters = {}) {
    return apiRequest<ApiEnvelope<{ rows: DataImportRow[]; pagination: PaginationMeta }>>(
      `/data-imports/${id}/rows${buildQueryString(filters)}`
    );
  },

  confirm(id: string, input: ConfirmDataImportInput) {
    return apiRequest<ApiEnvelope<{ import: DataImport }>>(`/data-imports/${id}/confirm`, {
      body: input,
      method: "POST"
    });
  },

  cancel(id: string) {
    return apiRequest<ApiEnvelope<null>>(`/data-imports/${id}/cancel`, {
      method: "POST"
    });
  }
};

function inferContentType(fileName: string) {
  return fileName.toLowerCase().endsWith(".xlsx")
    ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    : "text/csv";
}
