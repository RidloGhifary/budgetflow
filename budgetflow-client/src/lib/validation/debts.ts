import { z } from "zod";

import { positiveNumberInput } from "@/lib/validation/numbers";

export const debtTypeValues = ["I_OWE", "OWED_TO_ME"] as const;
export const debtStatusValues = ["UNPAID", "PARTIAL", "PAID"] as const;

const amountSchema = positiveNumberInput("Amount");
const dateInputSchema = z
  .string()
  .optional()
  .nullable()
  .refine((value) => !value || !Number.isNaN(Date.parse(`${value}T00:00:00`)), "Date must be valid.");

export const debtSchema = z.object({
  type: z.enum(debtTypeValues),
  title: z.string().trim().min(1, "Title is required.").max(120, "Title is too long."),
  personName: z.string().trim().min(1, "Person name is required.").max(120, "Person name is too long."),
  totalAmount: amountSchema,
  dueDate: dateInputSchema,
  note: z.string().trim().max(500, "Note is too long.").optional()
});

export const createDebtPaymentSchema = (remainingAmount: number) =>
  z.object({
    amount: amountSchema.max(remainingAmount, "Amount cannot exceed the remaining debt."),
    walletId: z.string().min(1, "Wallet is required."),
    categoryId: z.string().min(1, "Category is required."),
    paymentDate: z
      .string()
      .min(1, "Payment date is required.")
      .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00`)), "Payment date must be valid."),
    note: z.string().trim().max(500, "Note is too long.").optional()
  });

export type DebtFormValues = z.infer<typeof debtSchema>;
export type DebtPaymentFormValues = z.infer<ReturnType<typeof createDebtPaymentSchema>>;
