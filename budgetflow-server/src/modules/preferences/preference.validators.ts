import { z } from "zod";

export const updatePrivacyModeSchema = z
  .object({
    privacyModeEnabled: z.boolean({
      invalid_type_error: "Privacy mode must be enabled or disabled"
    })
  })
  .strict();

export type UpdatePrivacyModeInput = z.infer<typeof updatePrivacyModeSchema>;
