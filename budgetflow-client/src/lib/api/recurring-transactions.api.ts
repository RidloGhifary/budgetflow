import { apiRequest } from "@/lib/api/http";
import type {
  ApiEnvelope,
  RecurringTransaction,
  RecurringTransactionDetail,
  RecurringTransactionFrequency,
  RecurringTransactionStatus,
  Transaction,
  TransactionType
} from "@/types/api";

export interface RecurringTransactionFilters {
  categoryId?: string;
  frequency?: RecurringTransactionFrequency | "";
  sortBy?: "nextRunDate" | "createdAt" | "amount" | "name";
  sortDirection?: "asc" | "desc";
  status?: RecurringTransactionStatus | "";
  type?: TransactionType | "";
  walletId?: string;
}

export interface RecurringTransactionInput {
  amount: number;
  autoGenerate: boolean;
  categoryId: string;
  endDate?: string | null;
  frequency: RecurringTransactionFrequency;
  interval: number;
  name: string;
  note?: string | null;
  startDate: string;
  type: TransactionType;
  walletId: string;
}

export interface GenerateRecurringTransactionResult {
  generated: boolean;
  reason?: string;
  recurringTransactionId: string;
  scheduledForDate?: string;
  transaction?: Transaction;
}

function buildQueryString(filters: RecurringTransactionFilters) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, value);
    }
  });

  const queryString = params.toString();

  return queryString ? `?${queryString}` : "";
}

export const recurringTransactionsApi = {
  list(filters: RecurringTransactionFilters = {}) {
    return apiRequest<ApiEnvelope<{ recurringTransactions: RecurringTransaction[] }>>(
      `/recurring-transactions${buildQueryString(filters)}`
    );
  },

  get(id: string) {
    return apiRequest<ApiEnvelope<{ recurringTransaction: RecurringTransactionDetail }>>(`/recurring-transactions/${id}`);
  },

  create(input: RecurringTransactionInput) {
    return apiRequest<ApiEnvelope<{ recurringTransaction: RecurringTransaction }>>("/recurring-transactions", {
      method: "POST",
      body: input
    });
  },

  update(id: string, input: Partial<RecurringTransactionInput>) {
    return apiRequest<ApiEnvelope<{ recurringTransaction: RecurringTransaction }>>(`/recurring-transactions/${id}`, {
      method: "PATCH",
      body: input
    });
  },

  pause(id: string) {
    return apiRequest<ApiEnvelope<{ recurringTransaction: RecurringTransaction }>>(`/recurring-transactions/${id}/pause`, {
      method: "POST"
    });
  },

  resume(id: string) {
    return apiRequest<ApiEnvelope<{ recurringTransaction: RecurringTransaction }>>(`/recurring-transactions/${id}/resume`, {
      method: "POST"
    });
  },

  cancel(id: string) {
    return apiRequest<ApiEnvelope<{ recurringTransaction: RecurringTransaction }>>(`/recurring-transactions/${id}`, {
      method: "DELETE"
    });
  },

  generate(id: string) {
    return apiRequest<ApiEnvelope<GenerateRecurringTransactionResult>>(`/recurring-transactions/${id}/generate`, {
      method: "POST"
    });
  },

  generateDue() {
    return apiRequest<
      ApiEnvelope<{
        generatedCount: number;
        skippedCount: number;
        results: GenerateRecurringTransactionResult[];
      }>
    >("/recurring-transactions/generate-due", {
      method: "POST"
    });
  }
};
