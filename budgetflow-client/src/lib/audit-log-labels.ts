import type { AuditLogResult, AuditLogSeverity } from "@/types/api";

export const auditActionLabels: Record<string, string> = {
  "account.created": "Account created",
  "account.deleted": "Account deleted",
  "account.updated": "Account updated",
  "auth.login.failed": "Login failed",
  "auth.login.success": "Login successful",
  "auth.logout": "Logged out",
  "auth.register.success": "Account registered",
  "budget.created": "Budget created",
  "budget.deleted": "Budget deleted",
  "budget.updated": "Budget updated",
  "category.created": "Category created",
  "category.deleted": "Category deleted",
  "category.updated": "Category updated",
  "export.completed": "Export completed",
  "export.created": "Report exported",
  "export.downloaded": "Export downloaded",
  "export.failed": "Export failed",
  "export.requested": "Export requested",
  "import.cancelled": "Import cancelled",
  "import.completed": "Import completed",
  "import.completed_with_errors": "Import completed with issues",
  "import.confirmed": "Import confirmed",
  "import.failed": "Import failed",
  "import.preview_generated": "Import preview generated",
  "import.uploaded": "Import uploaded",
  "privacy_mode.disabled": "Privacy Mode disabled",
  "privacy_mode.enabled": "Privacy Mode enabled",
  "recurring_transaction.cancelled": "Recurring transaction cancelled",
  "recurring_transaction.created": "Recurring transaction created",
  "recurring_transaction.generated": "Recurring transaction generated",
  "recurring_transaction.paused": "Recurring transaction paused",
  "recurring_transaction.resumed": "Recurring transaction resumed",
  "recurring_transaction.updated": "Recurring transaction updated",
  "session.created": "Session created",
  "session.logout_others": "Other sessions logged out",
  "session.revoked": "Session revoked",
  "transaction.created": "Transaction created",
  "transaction.deleted": "Transaction deleted",
  "transaction.updated": "Transaction updated"
};

export const auditEntityLabels: Record<string, string> = {
  account: "Account",
  budget: "Budget",
  category: "Category",
  export: "Export",
  import: "Import",
  recurring_transaction: "Recurring transaction",
  session: "Session",
  transaction: "Transaction",
  user: "User"
};

export const auditResultLabels: Record<AuditLogResult, string> = {
  DENIED: "Denied",
  FAILURE: "Failure",
  SUCCESS: "Success"
};

export const auditSeverityLabels: Record<AuditLogSeverity, string> = {
  CRITICAL: "Critical",
  INFO: "Info",
  WARNING: "Warning"
};

export function formatAuditAction(action: string) {
  return auditActionLabels[action] ?? titleize(action.replaceAll(".", " "));
}

export function formatAuditEntity(entityType?: string | null) {
  if (!entityType) {
    return "General";
  }

  return auditEntityLabels[entityType] ?? titleize(entityType.replaceAll("_", " "));
}

function titleize(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
