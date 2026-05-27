import { apiRequest } from "@/lib/api/http";
import type { ApiEnvelope, UserPreferences } from "@/types/api";

export interface UpdatePrivacyModeInput {
  privacyModeEnabled: boolean;
}

export const preferencesApi = {
  get() {
    return apiRequest<ApiEnvelope<{ preferences: UserPreferences }>>("/preferences", {
      method: "GET"
    });
  },

  updatePrivacyMode(input: UpdatePrivacyModeInput) {
    return apiRequest<ApiEnvelope<{ preferences: UserPreferences }>>("/preferences/privacy-mode", {
      method: "PATCH",
      body: input
    });
  }
};
