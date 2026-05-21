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

export const authApi = {
  register(input: RegisterInput) {
    return apiRequest<ApiEnvelope<{ user: User }>>("/auth/register", {
      method: "POST",
      body: input
    });
  },

  login(input: LoginInput) {
    return apiRequest<ApiEnvelope<{ user: User }>>("/auth/login", {
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
