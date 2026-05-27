import type { UserPreference } from "@prisma/client";

export function toPreferenceResponse(preferences: UserPreference) {
  return {
    privacyModeEnabled: preferences.privacyModeEnabled,
    updatedAt: preferences.updatedAt
  };
}
