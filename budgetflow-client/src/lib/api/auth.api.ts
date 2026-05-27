import { apiRequest } from "@/lib/api/http";
import type { ApiEnvelope, User } from "@/types/api";

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface TwoFactorChallenge {
  challengeId: string;
  challengeToken: string;
  email: string;
  expiresAt: string;
  twoFactorRequired: true;
}

export type LoginResponseData = { user: User } | TwoFactorChallenge;

export const authApi = {
  register(input: RegisterInput) {
    return apiRequest<ApiEnvelope<{ user: User }>>("/auth/register", {
      method: "POST",
      body: input
    });
  },

  login(input: LoginInput) {
    return apiRequest<ApiEnvelope<LoginResponseData>>("/auth/login", {
      method: "POST",
      body: input
    });
  },

  verifyTwoFactor(input: { challengeId: string; challengeToken: string; code: string }) {
    return apiRequest<ApiEnvelope<{ user: User }>>("/auth/login/2fa", {
      method: "POST",
      body: input
    });
  },

  useRecoveryCode(input: { challengeId: string; challengeToken: string; recoveryCode: string }) {
    return apiRequest<ApiEnvelope<{ user: User }>>("/auth/login/recovery-code", {
      method: "POST",
      body: input
    });
  },

  me() {
    return apiRequest<ApiEnvelope<{ user: User }>>("/auth/me", {
      method: "GET"
    });
  },

  logout() {
    return apiRequest<ApiEnvelope<null>>("/auth/logout", {
      method: "POST"
    });
  }
};
