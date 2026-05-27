export type FinancialHealthStatus = "not_enough_data" | "excellent" | "good" | "fair" | "needs_attention" | "critical";

export type FinancialHealthComponentKey =
  | "cashflow_health"
  | "savings_rate"
  | "budget_discipline"
  | "recurring_burden"
  | "spending_stability";

export type FinancialHealthInsightType = "positive" | "warning" | "critical" | "neutral";

export type FinancialHealthInsightSeverity = "low" | "medium" | "high";

export interface FinancialHealthBudgetMetric {
  budgetId: string;
  categoryId: string;
  categoryName: string;
  limitAmount: number;
  usedAmount: number;
  usagePercentage: number;
}

export interface FinancialHealthAggregates {
  budgetMetrics: FinancialHealthBudgetMetric[];
  hasRecurringData: boolean;
  netCashflow: number;
  previousExpenseTotal: number | null;
  recurringExpenseTotal: number | null;
  recurringExpenseCount: number;
  totalExpense: number;
  totalIncome: number;
}

export interface FinancialHealthComponent {
  available: boolean;
  explanation: string;
  key: FinancialHealthComponentKey;
  label: string;
  score: number | null;
  values?: Record<string, number | string | null>;
  weight: number;
}

export interface FinancialHealthInsight {
  action?: string;
  categoryId?: string;
  categoryName?: string;
  description: string;
  id: string;
  relatedMetricKey?: FinancialHealthComponentKey;
  severity: FinancialHealthInsightSeverity;
  supportingValues?: Record<string, number | string | null>;
  title: string;
  type: FinancialHealthInsightType;
}

export interface FinancialHealthScoreResult {
  components: FinancialHealthComponent[];
  missingMetrics: FinancialHealthComponentKey[];
  score: number;
  status: FinancialHealthStatus;
  summary: string;
}
