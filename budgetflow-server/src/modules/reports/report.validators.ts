import { DebtStatus, DebtType, SavingGoalStatus, TransactionPurpose, TransactionType } from "@prisma/client";
import { z } from "zod";

const monthSchema = z.coerce.number().int("Month must be a whole number").min(1, "Month must be between 1 and 12").max(12, "Month must be between 1 and 12");
const yearSchema = z.coerce.number().int("Year must be a whole number").min(2000, "Year must be reasonable").max(2100, "Year must be reasonable");
const dateSchema = z.coerce.date({
  invalid_type_error: "Date must be valid"
});
const searchSchema = z.string().trim().min(1, "Search cannot be empty").max(120, "Search is too long");
const exportFormatSchema = z.enum(["xlsx", "csv"], {
  errorMap: () => ({ message: "Export format must be xlsx or csv" })
}).default("xlsx");

export const monthlyReportQuerySchema = z
  .object({
    month: monthSchema.optional(),
    year: yearSchema.optional()
  })
  .strict();

export const rangeReportQuerySchema = z
  .object({
    startDate: dateSchema,
    endDate: dateSchema
  })
  .strict()
  .superRefine((value, context) => {
    if (value.startDate > value.endDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "End date must be after start date"
      });
    }
  });

const transactionReportQueryBaseSchema = z
  .object({
    type: z.nativeEnum(TransactionType, { errorMap: () => ({ message: "Transaction type is invalid" }) }).optional(),
    purpose: z.nativeEnum(TransactionPurpose, { errorMap: () => ({ message: "Transaction purpose is invalid" }) }).optional(),
    walletId: z.string().uuid("Wallet ID must be valid").optional(),
    categoryId: z.string().uuid("Category ID must be valid").optional(),
    month: monthSchema.optional(),
    year: yearSchema.optional(),
    startDate: dateSchema.optional(),
    endDate: dateSchema.optional(),
    search: searchSchema.optional()
  })
  .strict();

export const transactionReportQuerySchema = transactionReportQueryBaseSchema
  .superRefine((value, context) => {
    if (value.month && !value.year) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["year"],
        message: "Year is required when filtering by month"
      });
    }

    if (value.startDate && value.endDate && value.startDate > value.endDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "End date must be after start date"
      });
    }
  });

export const budgetReportQuerySchema = monthlyReportQuerySchema;

const debtReportQueryBaseSchema = z
  .object({
    type: z.nativeEnum(DebtType, { errorMap: () => ({ message: "Debt type is invalid" }) }).optional(),
    status: z.nativeEnum(DebtStatus, { errorMap: () => ({ message: "Debt status is invalid" }) }).optional(),
    search: searchSchema.optional(),
    dueBefore: dateSchema.optional(),
    dueAfter: dateSchema.optional()
  })
  .strict();

export const debtReportQuerySchema = debtReportQueryBaseSchema
  .superRefine((value, context) => {
    if (value.dueBefore && value.dueAfter && value.dueBefore < value.dueAfter) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dueBefore"],
        message: "Due before must be after due after"
      });
    }
  });

const savingGoalReportQueryBaseSchema = z
  .object({
    status: z.nativeEnum(SavingGoalStatus, { errorMap: () => ({ message: "Saving goal status is invalid" }) }).optional(),
    search: searchSchema.optional(),
    deadlineBefore: dateSchema.optional(),
    deadlineAfter: dateSchema.optional()
  })
  .strict();

export const savingGoalReportQuerySchema = savingGoalReportQueryBaseSchema
  .superRefine((value, context) => {
    if (value.deadlineBefore && value.deadlineAfter && value.deadlineBefore < value.deadlineAfter) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["deadlineBefore"],
        message: "Deadline before must be after deadline after"
      });
    }
  });

export const monthlyExportQuerySchema = monthlyReportQuerySchema.extend({
  format: exportFormatSchema
});

export const transactionExportQuerySchema = transactionReportQueryBaseSchema.extend({
  format: exportFormatSchema
}).superRefine((value, context) => {
  if (value.month && !value.year) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["year"],
      message: "Year is required when filtering by month"
    });
  }

  if (value.startDate && value.endDate && value.startDate > value.endDate) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endDate"],
      message: "End date must be after start date"
    });
  }
});

export const budgetExportQuerySchema = budgetReportQuerySchema.extend({
  format: exportFormatSchema
});

export const debtExportQuerySchema = debtReportQueryBaseSchema.extend({
  format: exportFormatSchema
}).superRefine((value, context) => {
  if (value.dueBefore && value.dueAfter && value.dueBefore < value.dueAfter) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["dueBefore"],
      message: "Due before must be after due after"
    });
  }
});

export const savingGoalExportQuerySchema = savingGoalReportQueryBaseSchema.extend({
  format: exportFormatSchema
}).superRefine((value, context) => {
  if (value.deadlineBefore && value.deadlineAfter && value.deadlineBefore < value.deadlineAfter) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["deadlineBefore"],
      message: "Deadline before must be after deadline after"
    });
  }
});

export type MonthlyReportQueryInput = z.infer<typeof monthlyReportQuerySchema>;
export type RangeReportQueryInput = z.infer<typeof rangeReportQuerySchema>;
export type TransactionReportQueryInput = z.infer<typeof transactionReportQuerySchema>;
export type BudgetReportQueryInput = z.infer<typeof budgetReportQuerySchema>;
export type DebtReportQueryInput = z.infer<typeof debtReportQuerySchema>;
export type SavingGoalReportQueryInput = z.infer<typeof savingGoalReportQuerySchema>;
export type MonthlyExportQueryInput = z.infer<typeof monthlyExportQuerySchema>;
export type TransactionExportQueryInput = z.infer<typeof transactionExportQuerySchema>;
export type BudgetExportQueryInput = z.infer<typeof budgetExportQuerySchema>;
export type DebtExportQueryInput = z.infer<typeof debtExportQuerySchema>;
export type SavingGoalExportQueryInput = z.infer<typeof savingGoalExportQuerySchema>;
export type ExportFormat = z.infer<typeof exportFormatSchema>;
