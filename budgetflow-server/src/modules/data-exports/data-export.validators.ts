import { DataExportFormat, DataExportStatus, DataExportType, TransactionType } from "@prisma/client";
import { z } from "zod";

import { env } from "../../config/env";

const dateSchema = z.coerce.date({
  invalid_type_error: "Date must be valid"
});

const transactionFilterSchema = z
  .object({
    categoryId: z.string().uuid("Category ID must be valid").optional(),
    endDate: dateSchema.optional(),
    search: z.string().trim().min(1, "Search cannot be empty").max(120, "Search is too long").optional(),
    startDate: dateSchema.optional(),
    type: z.nativeEnum(TransactionType, { errorMap: () => ({ message: "Transaction type is invalid" }) }).optional(),
    walletId: z.string().uuid("Wallet ID must be valid").optional()
  })
  .strict()
  .superRefine((value, context) => {
    if ((value.startDate && !value.endDate) || (!value.startDate && value.endDate)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: value.startDate ? ["endDate"] : ["startDate"],
        message: "Start date and end date are required together"
      });
    }

    if (value.startDate && value.endDate) {
      if (value.startDate > value.endDate) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["endDate"],
          message: "End date must be after start date"
        });
      }

      if (getInclusiveDayCount(value.startDate, value.endDate) > env.exports.maxRangeDays) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["endDate"],
          message: `Export date range cannot be more than ${env.exports.maxRangeDays} days`
        });
      }
    }
  });

export const createDataExportSchema = z
  .object({
    exportType: z.nativeEnum(DataExportType, { errorMap: () => ({ message: "Export type is invalid" }) }),
    filters: transactionFilterSchema.default({}),
    format: z.nativeEnum(DataExportFormat, { errorMap: () => ({ message: "Export format is invalid" }) })
  })
  .strict()
  .superRefine((value, context) => {
    if (value.exportType !== "TRANSACTIONS") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["exportType"],
        message: "Only transaction exports are supported"
      });
    }

    if (value.format !== "CSV") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["format"],
        message: "Only CSV exports are supported"
      });
    }
  });

export const dataExportListQuerySchema = z
  .object({
    exportType: z.nativeEnum(DataExportType).optional(),
    format: z.nativeEnum(DataExportFormat).optional(),
    page: z.coerce.number().int("Page must be a whole number").positive("Page must be greater than zero").default(1),
    pageSize: z.coerce
      .number()
      .int("Page size must be a whole number")
      .positive("Page size must be greater than zero")
      .max(50, "Page size cannot be more than 50")
      .default(10),
    status: z.nativeEnum(DataExportStatus).optional()
  })
  .strict();

export type CreateDataExportInput = z.infer<typeof createDataExportSchema>;
export type DataExportListQueryInput = z.infer<typeof dataExportListQuerySchema>;
export type DataExportTransactionFilters = z.infer<typeof transactionFilterSchema>;

function getInclusiveDayCount(startDate: Date, endDate: Date) {
  const start = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());
  const end = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());

  return Math.floor((end - start) / (24 * 60 * 60 * 1000)) + 1;
}
