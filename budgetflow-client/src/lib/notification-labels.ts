import type { NotificationCategory, NotificationSeverity, NotificationStatus } from "@/types/api";

export const notificationTypeLabels: Record<string, string> = {
  "budget.critically_exceeded": "Budget critically exceeded",
  "budget.exceeded": "Budget exceeded",
  "budget.limit_reached": "Budget limit reached",
  "budget.threshold_80": "Budget nearing limit",
  "export.completed": "Export completed",
  "export.failed": "Export failed",
  "financial_health.improved": "Financial health improved",
  "financial_health.low_savings_rate": "Low savings rate",
  "financial_health.negative_cashflow": "Negative cashflow",
  "financial_health.score_dropped": "Financial health score dropped",
  "financial_health.spending_increased": "Spending increased",
  "import.completed": "Import completed",
  "import.completed_with_errors": "Import completed with issues",
  "import.failed": "Import failed",
  "privacy_mode.disabled": "Privacy Mode disabled",
  "privacy_mode.enabled": "Privacy Mode enabled",
  "recurring_transaction.failed": "Recurring transaction failed",
  "recurring_transaction.overdue": "Recurring transaction overdue",
  "recurring_transaction.due_soon": "Recurring transaction due soon",
  "recurring_transaction.generated": "Recurring transaction generated",
  "security.logout_others": "Other devices logged out",
  "security.new_login": "New login detected",
  "security.session_revoked": "Session revoked",
  "transaction.large_expense": "Large expense"
};

export const notificationCategoryLabels: Record<NotificationCategory, string> = {
  BUDGET: "Budget",
  FINANCE: "Finance",
  PRIVACY: "Privacy",
  RECURRING_TRANSACTION: "Recurring",
  SECURITY: "Security",
  SYSTEM: "System",
  TRANSACTION: "Transaction"
};

export const notificationSeverityLabels: Record<NotificationSeverity, string> = {
  CRITICAL: "Critical",
  INFO: "Info",
  SUCCESS: "Success",
  WARNING: "Warning"
};

export const notificationStatusLabels: Record<NotificationStatus, string> = {
  ARCHIVED: "Archived",
  READ: "Read",
  UNREAD: "Unread"
};

export function formatNotificationType(type: string) {
  return notificationTypeLabels[type] ?? titleize(type.replaceAll(".", " "));
}

export function formatNotificationEntity(entityType?: string | null) {
  if (!entityType) {
    return "General";
  }

  return titleize(entityType.replaceAll("_", " "));
}

function titleize(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
