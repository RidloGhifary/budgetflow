export const NOTIFICATION_TYPES = {
  BUDGET_CRITICALLY_EXCEEDED: "budget.critically_exceeded",
  BUDGET_EXCEEDED: "budget.exceeded",
  BUDGET_LIMIT_REACHED: "budget.limit_reached",
  BUDGET_THRESHOLD_80: "budget.threshold_80",
  EXPORT_COMPLETED: "export.completed",
  EXPORT_FAILED: "export.failed",
  FINANCIAL_HEALTH_IMPROVED: "financial_health.improved",
  FINANCIAL_HEALTH_LOW_SAVINGS_RATE: "financial_health.low_savings_rate",
  FINANCIAL_HEALTH_NEGATIVE_CASHFLOW: "financial_health.negative_cashflow",
  FINANCIAL_HEALTH_SCORE_DROPPED: "financial_health.score_dropped",
  FINANCIAL_HEALTH_SPENDING_INCREASED: "financial_health.spending_increased",
  IMPORT_COMPLETED: "import.completed",
  IMPORT_COMPLETED_WITH_ERRORS: "import.completed_with_errors",
  IMPORT_FAILED: "import.failed",
  PRIVACY_MODE_DISABLED: "privacy_mode.disabled",
  PRIVACY_MODE_ENABLED: "privacy_mode.enabled",
  RECURRING_TRANSACTION_FAILED: "recurring_transaction.failed",
  RECURRING_TRANSACTION_OVERDUE: "recurring_transaction.overdue",
  RECURRING_TRANSACTION_DUE_SOON: "recurring_transaction.due_soon",
  RECURRING_TRANSACTION_GENERATED: "recurring_transaction.generated",
  SECURITY_ACCOUNT_DATA_DOWNLOADED: "security.account_data_downloaded",
  SECURITY_ACCOUNT_DELETED: "security.account_deleted",
  SECURITY_PASSWORD_CHANGED: "security.password_changed",
  SECURITY_LOGOUT_OTHERS: "security.logout_others",
  SECURITY_NEW_LOGIN: "security.new_login",
  SECURITY_RECOVERY_CODE_USED: "security.recovery_code_used",
  SECURITY_RECOVERY_CODES_REGENERATED: "security.recovery_codes_regenerated",
  SECURITY_SESSION_REVOKED: "security.session_revoked",
  SECURITY_TWO_FACTOR_DISABLED: "security.two_factor_disabled",
  SECURITY_TWO_FACTOR_ENABLED: "security.two_factor_enabled",
  TRANSACTION_LARGE_EXPENSE: "transaction.large_expense"
} as const;

export const NOTIFICATION_ENTITY_TYPES = {
  BUDGET: "budget",
  EXPORT: "export",
  FINANCIAL_HEALTH: "financial_health",
  IMPORT: "import",
  NOTIFICATION: "notification",
  RECURRING_TRANSACTION: "recurring_transaction",
  SESSION: "session",
  TRANSACTION: "transaction",
  USER: "user"
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];
export type NotificationEntityType = (typeof NOTIFICATION_ENTITY_TYPES)[keyof typeof NOTIFICATION_ENTITY_TYPES];
