"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { authApi, type LoginInput, type LoginResponseData, type RegisterInput } from "@/lib/api/auth.api";
import { ApiError, getFriendlyApiError } from "@/lib/api/http";
import type { User } from "@/types/api";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  errorMessage: string | null;
  refreshUser: () => Promise<User | null>;
  login: (input: LoginInput) => Promise<LoginResponseData>;
  useRecoveryCode: (input: { challengeId: string; challengeToken: string; recoveryCode: string }) => Promise<User>;
  verifyTwoFactor: (input: { challengeId: string; challengeToken: string; code: string }) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshUser = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await authApi.me();
      setUser(response.data.user);
      return response.data.user;
    } catch (error) {
      setUser(null);

      if (error instanceof ApiError && error.status === 401) {
        return null;
      }

      setErrorMessage(getFriendlyApiError(error, "request"));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (input: LoginInput) => {
    const response = await authApi.login(input);
    setErrorMessage(null);

    if ("user" in response.data) {
      setUser(response.data.user);
    }

    return response.data;
  }, []);

  const verifyTwoFactor = useCallback(async (input: { challengeId: string; challengeToken: string; code: string }) => {
    const response = await authApi.verifyTwoFactor(input);
    setUser(response.data.user);
    setErrorMessage(null);
    return response.data.user;
  }, []);

  const useRecoveryCode = useCallback(async (input: { challengeId: string; challengeToken: string; recoveryCode: string }) => {
    const response = await authApi.useRecoveryCode(input);
    setUser(response.data.user);
    setErrorMessage(null);
    return response.data.user;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const response = await authApi.register(input);
    setUser(response.data.user);
    setErrorMessage(null);
    return response.data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setErrorMessage(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      errorMessage,
      refreshUser,
      login,
      useRecoveryCode,
      verifyTwoFactor,
      register,
      logout
    }),
    [errorMessage, isLoading, login, logout, refreshUser, register, useRecoveryCode, user, verifyTwoFactor]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
