import { z } from "zod";

const monthSchema = z.coerce.number().int("Month must be a whole number").min(1, "Month must be between 1 and 12").max(12, "Month must be between 1 and 12");
const yearSchema = z.coerce.number().int("Year must be a whole number").min(2000, "Year is too early").max(2100, "Year is too far in the future");

export const dashboardSummaryQuerySchema = z
  .object({
    month: monthSchema.optional(),
    year: yearSchema.optional()
  })
  .strict()
  .superRefine((value, context) => {
    if (value.month && !value.year) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["year"],
        message: "Year is required when month is provided"
      });
    }

    if (value.year && !value.month) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["month"],
        message: "Month is required when year is provided"
      });
    }
  });

export type DashboardSummaryQueryInput = z.infer<typeof dashboardSummaryQuerySchema>;
