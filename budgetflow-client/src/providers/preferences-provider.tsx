"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { preferencesApi } from "@/lib/api/preferences.api";
import { ApiError, getFriendlyApiError } from "@/lib/api/http";
import { useAuth } from "@/providers/auth-provider";
import type { UserPreferences } from "@/types/api";

interface PreferencesContextValue {
  preferences: UserPreferences;
  privacyModeEnabled: boolean;
  isLoading: boolean;
  isUpdatingPrivacyMode: boolean;
  errorMessage: string | null;
  refreshPreferences: () => Promise<UserPreferences | null>;
  updatePrivacyMode: (privacyModeEnabled: boolean) => Promise<UserPreferences>;
}

const defaultPreferences: UserPreferences = {
  privacyModeEnabled: false,
  updatedAt: ""
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdatingPrivacyMode, setIsUpdatingPrivacyMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshPreferences = useCallback(async () => {
    if (!isAuthenticated) {
      setPreferences(defaultPreferences);
      setErrorMessage(null);
      setIsLoading(false);
      return null;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await preferencesApi.get();
      setPreferences(response.data.preferences);
      return response.data.preferences;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setPreferences(defaultPreferences);
        return null;
      }

      setErrorMessage(getFriendlyApiError(error, "loadPreferences"));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    void refreshPreferences();
  }, [isAuthLoading, refreshPreferences]);

  const updatePrivacyMode = useCallback(
    async (privacyModeEnabled: boolean) => {
      const previousPreferences = preferences;

      setIsUpdatingPrivacyMode(true);
      setErrorMessage(null);
      setPreferences((current) => ({
        ...current,
        privacyModeEnabled
      }));

      try {
        const response = await preferencesApi.updatePrivacyMode({ privacyModeEnabled });
        setPreferences(response.data.preferences);
        return response.data.preferences;
      } catch (error) {
        setPreferences(previousPreferences);
        setErrorMessage(getFriendlyApiError(error, "updatePrivacyMode"));
        throw error;
      } finally {
        setIsUpdatingPrivacyMode(false);
      }
    },
    [preferences]
  );

  const value = useMemo(
    () => ({
      preferences,
      privacyModeEnabled: preferences.privacyModeEnabled,
      isLoading,
      isUpdatingPrivacyMode,
      errorMessage,
      refreshPreferences,
      updatePrivacyMode
    }),
    [errorMessage, isLoading, isUpdatingPrivacyMode, preferences, refreshPreferences, updatePrivacyMode]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);

  if (!context) {
    throw new Error("usePreferences must be used within PreferencesProvider.");
  }

  return context;
}
