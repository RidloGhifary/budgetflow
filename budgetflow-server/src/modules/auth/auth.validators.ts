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

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
