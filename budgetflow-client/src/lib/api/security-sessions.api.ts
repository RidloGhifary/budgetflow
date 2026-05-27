import { apiFileRequest, apiRequest } from "@/lib/api/http";
import type { ApiEnvelope, LoginHistoryItem, SecuritySession, TwoFactorSetup, TwoFactorStatus } from "@/types/api";

export const securitySessionsApi = {
  list() {
    return apiRequest<ApiEnvelope<{ sessions: SecuritySession[] }>>("/security/sessions", {
      method: "GET"
    });
  },

  revoke(id: string) {
    return apiRequest<ApiEnvelope<{ revokedSessionId: string; revokedCurrentSession: boolean }>>(
      `/security/sessions/${id}`,
      {
        method: "DELETE"
      }
    );
  },

  logoutOthers() {
    return apiRequest<ApiEnvelope<{ revokedCount: number }>>("/security/sessions/logout-others", {
      method: "POST"
    });
  },

  changePassword(input: { currentPassword: string; newPassword: string; confirmNewPassword: string }) {
    return apiRequest<ApiEnvelope<{ changed: boolean }>>("/security/change-password", {
      method: "POST",
      body: input
    });
  },

  getTwoFactorStatus() {
    return apiRequest<ApiEnvelope<{ status: TwoFactorStatus }>>("/security/2fa", {
      method: "GET"
    });
  },

  startTwoFactorSetup() {
    return apiRequest<ApiEnvelope<{ setup: TwoFactorSetup }>>("/security/2fa/setup", {
      method: "POST"
    });
  },

  verifyTwoFactorSetup(input: { code: string }) {
    return apiRequest<ApiEnvelope<{ recoveryCodes: string[]; status: TwoFactorStatus }>>("/security/2fa/setup/verify", {
      method: "POST",
      body: input
    });
  },

  cancelTwoFactorSetup() {
    return apiRequest<ApiEnvelope<{ status: TwoFactorStatus }>>("/security/2fa/setup/cancel", {
      method: "POST"
    });
  },

  disableTwoFactor(input: { password: string; code: string }) {
    return apiRequest<ApiEnvelope<{ status: TwoFactorStatus }>>("/security/2fa/disable", {
      method: "POST",
      body: input
    });
  },

  regenerateRecoveryCodes(input: { password: string; code: string }) {
    return apiRequest<ApiEnvelope<{ recoveryCodes: string[]; status: TwoFactorStatus }>>(
      "/security/2fa/recovery-codes/regenerate",
      {
        method: "POST",
        body: input
      }
    );
  },

  getLoginHistory() {
    return apiRequest<ApiEnvelope<{ history: LoginHistoryItem[] }>>("/security/login-history", {
      method: "GET"
    });
  },

  downloadAccountData() {
    return apiFileRequest("/security/account-data/download", {
      method: "GET"
    });
  },

  deleteAccount(input: { password: string; confirmation: "DELETE"; code?: string }) {
    return apiRequest<ApiEnvelope<{ deleted: boolean }>>("/security/account", {
      method: "DELETE",
      body: input
    });
  }
};
