import { z } from "zod";

export const savingGoalStatusValues = ["IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;

const amountSchema = z.coerce.number().finite("Amount must be a valid number.").positive("Amount must be greater than zero.");
const dateInputSchema = z
  .string()
  .optional()
  .nullable()
  .refine((value) => !value || !Number.isNaN(Date.parse(`${value}T00:00:00`)), "Date must be valid.");

export const savingGoalSchema = z.object({
  name: z.string().trim().min(1, "Goal name is required.").max(120, "Goal name is too long."),
  targetAmount: amountSchema,
  deadline: dateInputSchema,
  note: z.string().trim().max(500, "Note is too long.").optional(),
  status: z.union([z.literal(""), z.literal("CANCELLED")]).optional()
});

export const savingContributionSchema = z.object({
  amount: amountSchema,
  walletId: z.string().min(1, "Wallet is required."),
  categoryId: z.string().min(1, "Expense category is required."),
  contributionDate: z
    .string()
    .min(1, "Contribution date is required.")
    .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00`)), "Contribution date must be valid."),
  note: z.string().trim().max(500, "Note is too long.").optional()
});

export type SavingGoalFormValues = z.infer<typeof savingGoalSchema>;
export type SavingContributionFormValues = z.infer<typeof savingContributionSchema>;
