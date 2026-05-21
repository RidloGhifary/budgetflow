import { z } from "zod";

export const budgetSchema = z.object({
  categoryId: z.string().min(1, "Expense category is required."),
  month: z.coerce.number().int("Month must be a whole number.").min(1, "Month must be between 1 and 12.").max(12, "Month must be between 1 and 12."),
  year: z.coerce.number().int("Year must be a whole number.").min(2000, "Year must be 2000 or later.").max(2100, "Year must be 2100 or earlier."),
  limitAmount: z.coerce.number().finite("Limit must be a valid number.").positive("Limit must be greater than zero.")
});

export type BudgetFormValues = z.infer<typeof budgetSchema>;
