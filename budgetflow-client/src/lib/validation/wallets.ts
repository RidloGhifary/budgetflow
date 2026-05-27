import { z } from "zod";

import { nonNegativeNumberInput } from "@/lib/validation/numbers";

export const walletTypeValues = ["CASH", "BANK", "EWALLET", "CREDIT_CARD", "OTHER"] as const;

export const walletSchema = z.object({
  name: z.string().trim().min(1, "Wallet name is required."),
  type: z.enum(walletTypeValues),
  initialBalance: nonNegativeNumberInput("Initial balance")
});

export type WalletFormValues = z.infer<typeof walletSchema>;
