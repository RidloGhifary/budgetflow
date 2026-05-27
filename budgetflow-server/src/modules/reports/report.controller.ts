import type { Response } from "express";

import { sendSuccess } from "../../utils/api-response";
import { asyncHandler } from "../../utils/async-handler";
import { getAuthenticatedUserId } from "../../utils/auth-context";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "../audit-logs/audit-log.constants";
import { getAuditRequestContext } from "../audit-logs/audit-log.context";
import { recordAuditLogSafely } from "../audit-logs/audit-log.service";
import { NOTIFICATION_ENTITY_TYPES, NOTIFICATION_TYPES } from "../notifications/notification.constants";
import { createUserNotificationSafely } from "../notifications/notification.service";
import {
  exportBudgetReport,
  exportDebtReport,
  exportMonthlyReport,
  exportSavingGoalReport,
  exportTransactionReport,
  type ExportedReportFile
} from "./report-export.service";
import {
  getBudgetReport,
  getDebtReport,
  getMonthlyReport,
  getRangeReport,
  getSavingGoalReport,
  getTransactionReport
} from "./report.service";
import type {
  BudgetExportQueryInput,
  BudgetReportQueryInput,
  DebtExportQueryInput,
  DebtReportQueryInput,
  MonthlyExportQueryInput,
  MonthlyReportQueryInput,
  RangeReportQueryInput,
  SavingGoalExportQueryInput,
  SavingGoalReportQueryInput,
  TransactionExportQueryInput,
  TransactionReportQueryInput
} from "./report.validators";

export const getMonthlyReportController = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const report = await getMonthlyReport(userId, req.query as unknown as MonthlyReportQueryInput);

  return sendSuccess(res, {
    message: "Monthly report generated",
    data: { report }
  });
});

export const getRangeReportController = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const report = await getRangeReport(userId, req.query as unknown as RangeReportQueryInput);

  return sendSuccess(res, {
    message: "Date range report generated",
    data: { report }
  });
});

export const getTransactionReportController = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const report = await getTransactionReport(userId, req.query as unknown as TransactionReportQueryInput);

  return sendSuccess(res, {
    message: "Transaction report generated",
    data: { report }
  });
});

export const getBudgetReportController = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const report = await getBudgetReport(userId, req.query as unknown as BudgetReportQueryInput);

  return sendSuccess(res, {
    message: "Budget report generated",
    data: { report }
  });
});

export const getDebtReportController = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const report = await getDebtReport(userId, req.query as unknown as DebtReportQueryInput);

  return sendSuccess(res, {
    message: "Debt report generated",
    data: { report }
  });
});

export const getSavingGoalReportController = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const report = await getSavingGoalReport(userId, req.query as unknown as SavingGoalReportQueryInput);

  return sendSuccess(res, {
    message: "Saving goal report generated",
    data: { report }
  });
});

export const exportMonthlyReportController = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const query = req.query as unknown as MonthlyExportQueryInput;
  const file = await exportMonthlyReport(userId, query);

  await auditReportExport(req, userId, "monthly", file, query.format);
  return sendReportFile(res, file);
});

export const exportTransactionReportController = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const query = req.query as unknown as TransactionExportQueryInput;
  const file = await exportTransactionReport(userId, query);

  await auditReportExport(req, userId, "transactions", file, query.format);
  return sendReportFile(res, file);
});

export const exportBudgetReportController = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const query = req.query as unknown as BudgetExportQueryInput;
  const file = await exportBudgetReport(userId, query);

  await auditReportExport(req, userId, "budgets", file, query.format);
  return sendReportFile(res, file);
});

export const exportDebtReportController = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const query = req.query as unknown as DebtExportQueryInput;
  const file = await exportDebtReport(userId, query);

  await auditReportExport(req, userId, "debts", file, query.format);
  return sendReportFile(res, file);
});

export const exportSavingGoalReportController = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const query = req.query as unknown as SavingGoalExportQueryInput;
  const file = await exportSavingGoalReport(userId, query);

  await auditReportExport(req, userId, "goals", file, query.format);
  return sendReportFile(res, file);
});

async function auditReportExport(
  req: Parameters<typeof getAuditRequestContext>[0],
  userId: string,
  reportType: string,
  file: ExportedReportFile,
  format: string
) {
  await recordAuditLogSafely({
    action: AUDIT_ACTIONS.REPORT_EXPORTED,
    context: getAuditRequestContext(req),
    entityType: AUDIT_ENTITY_TYPES.EXPORT,
    metadata: {
      fileName: file.fileName,
      format,
      reportType
    },
    userId
  });

  await createUserNotificationSafely({
    actionUrl: "/reports",
    category: "SYSTEM",
    entityType: NOTIFICATION_ENTITY_TYPES.EXPORT,
    message: "Your report export is ready.",
    metadata: {
      fileName: file.fileName,
      format,
      reportType
    },
    severity: "SUCCESS",
    title: "Export completed",
    type: NOTIFICATION_TYPES.EXPORT_COMPLETED,
    userId
  });
}

function sendReportFile(res: Response, file: ExportedReportFile) {
  res.setHeader("Content-Type", file.contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${file.fileName}"`);
  res.setHeader("Content-Length", file.buffer.length);

  return res.status(200).send(file.buffer);
}
