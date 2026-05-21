import { z } from "zod";

export const transactionTypeValues = ["INCOME", "EXPENSE"] as const;
export const transactionPurposeValues = ["NORMAL", "DEBT_PAYMENT", "DEBT_COLLECTION", "SAVING_CONTRIBUTION"] as const;

export const transactionSchema = z
  .object({
    walletId: z.string().min(1, "Wallet is required."),
    categoryId: z.string().min(1, "Category is required."),
    type: z.enum(transactionTypeValues),
    purpose: z.enum(transactionPurposeValues),
    amount: z.coerce.number().finite("Amount must be a valid number.").positive("Amount must be greater than zero."),
    transactionDate: z
      .string()
      .min(1, "Transaction date is required.")
      .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00`)), "Transaction date must be valid."),
    note: z.string().trim().max(500, "Note is too long.").optional()
  })
  .superRefine((value, context) => {
    if (value.purpose === "DEBT_COLLECTION" && value.type !== "INCOME") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["type"],
        message: "Debt collection must be an income transaction."
      });
    }

    if ((value.purpose === "DEBT_PAYMENT" || value.purpose === "SAVING_CONTRIBUTION") && value.type !== "EXPENSE") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["type"],
        message: "This purpose must be an expense transaction."
      });
    }
  });

export type TransactionFormValues = z.infer<typeof transactionSchema>;
