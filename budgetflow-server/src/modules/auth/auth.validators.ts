import { z } from "zod";

import { isBlockedEmailDomain, normalizeEmail } from "./email-policy";

const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Please enter a valid email address.")
  .transform(normalizeEmail);

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120, "Name is too long"),
  email: emailSchema.refine((email) => !isBlockedEmailDomain(email), {
    message: "Please use a permanent email address."
  }),
  password: z.string().min(8, "Password must be at least 8 characters")
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required")
});

export const twoFactorLoginSchema = z.object({
  challengeId: z.string().uuid("Invalid 2FA challenge."),
  challengeToken: z.string().min(20, "Invalid 2FA challenge."),
  code: z.string().trim().min(6, "Enter the 6-digit code.").max(12, "Verification code is too long.")
});

export const recoveryCodeLoginSchema = z.object({
  challengeId: z.string().uuid("Invalid 2FA challenge."),
  challengeToken: z.string().min(20, "Invalid 2FA challenge."),
  recoveryCode: z.string().trim().min(8, "Enter a recovery code.").max(32, "Recovery code is too long.")
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmNewPassword: z.string().min(1, "Confirm your new password.")
  })
  .refine((input) => input.newPassword === input.confirmNewPassword, {
    message: "New password and confirmation do not match.",
    path: ["confirmNewPassword"]
  });

export const verifyTwoFactorSetupSchema = z.object({
  code: z.string().trim().min(6, "Enter the 6-digit code.").max(12, "Verification code is too long.")
});

export const confirmTwoFactorSchema = z.object({
  password: z.string().min(1, "Password is required."),
  code: z.string().trim().min(6, "Enter a 2FA code or recovery code.").max(32, "Code is too long.")
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Password is required."),
  confirmation: z.literal("DELETE", {
    errorMap: () => ({ message: "Type DELETE to confirm account deletion." })
  }),
  code: z.string().trim().max(32, "Code is too long.").optional()
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type TwoFactorLoginInput = z.infer<typeof twoFactorLoginSchema>;
export type RecoveryCodeLoginInput = z.infer<typeof recoveryCodeLoginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type VerifyTwoFactorSetupInput = z.infer<typeof verifyTwoFactorSetupSchema>;
export type ConfirmTwoFactorInput = z.infer<typeof confirmTwoFactorSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
