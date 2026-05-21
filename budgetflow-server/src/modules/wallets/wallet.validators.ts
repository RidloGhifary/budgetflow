import { WalletType } from "@prisma/client";
import { z } from "zod";

const balanceSchema = z.coerce
  .number({
    invalid_type_error: "Balance must be a valid number"
  })
  .finite("Balance must be a valid number")
  .min(0, "Balance cannot be negative");

export const walletQuerySchema = z
  .object({
    search: z.string().trim().min(1, "Search cannot be empty").optional(),
    type: z.nativeEnum(WalletType).optional()
  })
  .strict();

export const createWalletSchema = z
  .object({
    name: z.string().trim().min(1, "Wallet name is required").max(120, "Wallet name is too long"),
    type: z.nativeEnum(WalletType, {
      errorMap: () => ({ message: "Wallet type is invalid" })
    }),
    initialBalance: balanceSchema.default(0)
  })
  .strict();

export const updateWalletSchema = z
  .object({
    name: z.string().trim().min(1, "Wallet name is required").max(120, "Wallet name is too long").optional(),
    type: z
      .nativeEnum(WalletType, {
        errorMap: () => ({ message: "Wallet type is invalid" })
      })
      .optional(),
    initialBalance: balanceSchema.optional()
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required"
  });

export type WalletQueryInput = z.infer<typeof walletQuerySchema>;
export type CreateWalletInput = z.infer<typeof createWalletSchema>;
export type UpdateWalletInput = z.infer<typeof updateWalletSchema>;
