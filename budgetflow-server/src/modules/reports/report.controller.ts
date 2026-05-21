import type { Response } from "express";

import { sendSuccess } from "../../utils/api-response";
import { asyncHandler } from "../../utils/async-handler";
import { getAuthenticatedUserId } from "../../utils/auth-context";
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
  const file = await exportMonthlyReport(userId, req.query as unknown as MonthlyExportQueryInput);

  return sendReportFile(res, file);
});

export const exportTransactionReportController = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const file = await exportTransactionReport(userId, req.query as unknown as TransactionExportQueryInput);

  return sendReportFile(res, file);
});

export const exportBudgetReportController = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const file = await exportBudgetReport(userId, req.query as unknown as BudgetExportQueryInput);

  return sendReportFile(res, file);
});

export const exportDebtReportController = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const file = await exportDebtReport(userId, req.query as unknown as DebtExportQueryInput);

  return sendReportFile(res, file);
});

export const exportSavingGoalReportController = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const file = await exportSavingGoalReport(userId, req.query as unknown as SavingGoalExportQueryInput);

  return sendReportFile(res, file);
});

function sendReportFile(res: Response, file: ExportedReportFile) {
  res.setHeader("Content-Type", file.contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${file.fileName}"`);
  res.setHeader("Content-Length", file.buffer.length);

  return res.status(200).send(file.buffer);
}
