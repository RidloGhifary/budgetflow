import { apiRequest } from "@/lib/api/http";
import type {
  ApiEnvelope,
  SavingContribution,
  SavingGoal,
  SavingGoalDetail,
  SavingGoalStatus,
  SavingGoalSummary
} from "@/types/api";

export interface SavingGoalFilters {
  status?: SavingGoalStatus | "";
  search?: string;
  deadlineBefore?: string;
  deadlineAfter?: string;
}

export interface SavingGoalInput {
  name: string;
  targetAmount: number;
  deadline?: string | null;
  note?: string | null;
  status?: "CANCELLED";
}

export interface SavingContributionInput {
  amount: number;
  walletId: string;
  categoryId: string;
  contributionDate: string;
  note?: string | null;
}

function buildQueryString(filters: SavingGoalFilters) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });

  const queryString = params.toString();

  return queryString ? `?${queryString}` : "";
}

export const goalsApi = {
  list(filters: SavingGoalFilters = {}) {
    return apiRequest<ApiEnvelope<{ goals: SavingGoal[] }>>(`/goals${buildQueryString(filters)}`);
  },

  get(id: string) {
    return apiRequest<ApiEnvelope<{ goal: SavingGoalDetail }>>(`/goals/${id}`);
  },

  summary() {
    return apiRequest<ApiEnvelope<{ summary: SavingGoalSummary }>>("/goals/summary");
  },

  create(input: SavingGoalInput) {
    return apiRequest<ApiEnvelope<{ goal: SavingGoal }>>("/goals", {
      method: "POST",
      body: input
    });
  },

  update(id: string, input: SavingGoalInput) {
    return apiRequest<ApiEnvelope<{ goal: SavingGoal }>>(`/goals/${id}`, {
      method: "PATCH",
      body: input
    });
  },

  delete(id: string) {
    return apiRequest<ApiEnvelope<null>>(`/goals/${id}`, {
      method: "DELETE"
    });
  },

  addContribution(id: string, input: SavingContributionInput) {
    return apiRequest<ApiEnvelope<{ goal: SavingGoal; contribution: SavingContribution }>>(`/goals/${id}/contributions`, {
      method: "POST",
      body: input
    });
  }
};
