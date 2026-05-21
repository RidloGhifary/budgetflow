import type { ReportFilterState } from "@/hooks/use-reports";
import type { ReportType } from "@/types/api";

export function getReportValidationMessage(reportType: ReportType, filters: ReportFilterState) {
  if (reportType === "range") {
    return validateDateRange(filters.range.startDate, filters.range.endDate);
  }

  if (reportType === "transactions") {
    const rangeMessage = validateOptionalDateRange(filters.transactions.startDate, filters.transactions.endDate);

    if (rangeMessage) {
      return rangeMessage;
    }

    if (filters.transactions.month && !filters.transactions.year) {
      return "Year is required when filtering transactions by month.";
    }
  }

  if (reportType === "debts") {
    return validateOptionalDateRange(filters.debts.dueAfter, filters.debts.dueBefore, "Due after", "Due before");
  }

  if (reportType === "goals") {
    return validateOptionalDateRange(filters.goals.deadlineAfter, filters.goals.deadlineBefore, "Deadline after", "Deadline before");
  }

  return null;
}

function validateDateRange(startDate: string, endDate: string) {
  if (!startDate) {
    return "Start date is required.";
  }

  if (!endDate) {
    return "End date is required.";
  }

  return validateOptionalDateRange(startDate, endDate);
}

function validateOptionalDateRange(startDate?: string, endDate?: string, startLabel = "Start date", endLabel = "End date") {
  if (!startDate || !endDate) {
    return null;
  }

  const start = Date.parse(`${startDate}T00:00:00`);
  const end = Date.parse(`${endDate}T00:00:00`);

  if (Number.isNaN(start)) {
    return `${startLabel} must be valid.`;
  }

  if (Number.isNaN(end)) {
    return `${endLabel} must be valid.`;
  }

  if (start > end) {
    return `${startLabel} must not be after ${endLabel.toLowerCase()}.`;
  }

  return null;
}
