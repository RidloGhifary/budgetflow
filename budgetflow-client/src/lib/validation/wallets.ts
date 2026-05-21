import { z } from "zod";

export const walletTypeValues = ["CASH", "BANK", "EWALLET", "CREDIT_CARD", "OTHER"] as const;

export const walletSchema = z.object({
  name: z.string().trim().min(1, "Wallet name is required."),
  type: z.enum(walletTypeValues),
  initialBalance: z.coerce.number().min(0, "Initial balance cannot be negative.")
});

export type WalletFormValues = z.infer<typeof walletSchema>;
