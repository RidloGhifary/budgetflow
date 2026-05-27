import { z } from "zod";

import type { RecurringTransactionFrequency, TransactionType } from "@/types/api";

export const recurringFrequencyValues: RecurringTransactionFrequency[] = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"];
export const recurringTransactionTypeValues: TransactionType[] = ["EXPENSE", "INCOME"];

const amountSchema = z.coerce.number().finite("Amount must be a valid number.").positive("Amount must be greater than zero.");

export const recurringTransactionSchema = z
  .object({
    walletId: z.string().min(1, "Wallet is required."),
    categoryId: z.string().min(1, "Category is required."),
    name: z.string().trim().min(1, "Name is required.").max(120, "Name is too long."),
    note: z.string().trim().max(500, "Note is too long.").optional(),
    type: z.enum(["EXPENSE", "INCOME"], {
      errorMap: () => ({ message: "Type is required." })
    }),
    amount: amountSchema,
    frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"], {
      errorMap: () => ({ message: "Frequency is required." })
    }),
    interval: z.coerce.number().int("Interval must be a whole number.").positive("Interval must be greater than zero.").max(60, "Interval is too large."),
    startDate: z.string().min(1, "Start date is required."),
    endDate: z.string().optional(),
    autoGenerate: z.boolean()
  })
  .superRefine((value, context) => {
    if (value.endDate && value.startDate && value.endDate < value.startDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "End date must be after start date."
      });
    }
  });

export type RecurringTransactionFormValues = z.infer<typeof recurringTransactionSchema>;
