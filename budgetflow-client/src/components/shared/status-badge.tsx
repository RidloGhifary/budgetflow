import { Badge } from "@/components/ui/badge";
import type { BudgetStatus, DebtStatus, GoalStatus } from "@/types/finance";

type KnownStatus = BudgetStatus | DebtStatus | GoalStatus | "INCOME" | "EXPENSE";

const statusMap: Record<KnownStatus, { label: string; variant: "default" | "success" | "warning" | "danger" | "muted" }> = {
  SAFE: { label: "Safe", variant: "success" },
  WARNING: { label: "Warning", variant: "warning" },
  OVER_BUDGET: { label: "Over budget", variant: "danger" },
  UNPAID: { label: "Unpaid", variant: "danger" },
  PARTIAL: { label: "Partial", variant: "warning" },
  PAID: { label: "Paid", variant: "success" },
  IN_PROGRESS: { label: "In progress", variant: "default" },
  COMPLETED: { label: "Completed", variant: "success" },
  CANCELLED: { label: "Cancelled", variant: "muted" },
  INCOME: { label: "Income", variant: "success" },
  EXPENSE: { label: "Expense", variant: "danger" }
};

export function StatusBadge({ status }: { status: KnownStatus }) {
  const config = statusMap[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
