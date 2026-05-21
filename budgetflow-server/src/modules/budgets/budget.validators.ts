import { z } from "zod";

const monthSchema = z.coerce.number().int("Month must be a whole number").min(1, "Month must be between 1 and 12").max(12, "Month must be between 1 and 12");
const yearSchema = z.coerce.number().int("Year must be a whole number").min(2000, "Year is too early").max(2100, "Year is too far in the future");
const limitAmountSchema = z.coerce
  .number({
    invalid_type_error: "Limit amount must be a valid number"
  })
  .finite("Limit amount must be a valid number")
  .positive("Limit amount must be greater than zero");

const monthYearPairRefinement = (value: { month?: number; year?: number }, context: z.RefinementCtx) => {
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
};

export const budgetQuerySchema = z
  .object({
    month: monthSchema.optional(),
    year: yearSchema.optional(),
    categoryId: z.string().uuid("Category ID must be valid").optional()
  })
  .strict()
  .superRefine(monthYearPairRefinement);

export const budgetSummaryQuerySchema = z
  .object({
    month: monthSchema.optional(),
    year: yearSchema.optional()
  })
  .strict()
  .superRefine(monthYearPairRefinement);

export const createBudgetSchema = z
  .object({
    categoryId: z.string().uuid("Category ID must be valid"),
    month: monthSchema,
    year: yearSchema,
    limitAmount: limitAmountSchema
  })
  .strict();

export const updateBudgetSchema = z
  .object({
    categoryId: z.string().uuid("Category ID must be valid").optional(),
    month: monthSchema.optional(),
    year: yearSchema.optional(),
    limitAmount: limitAmountSchema.optional()
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    path: ["body"],
    message: "At least one field is required"
  });

export type BudgetQueryInput = z.infer<typeof budgetQuerySchema>;
export type BudgetSummaryQueryInput = z.infer<typeof budgetSummaryQuerySchema>;
export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;
