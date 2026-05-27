"use client";

import { useCallback, useEffect, useState } from "react";

import { securitySessionsApi } from "@/lib/api/security-sessions.api";
import { getFriendlyApiError } from "@/lib/api/http";
import type { SecuritySession } from "@/types/api";

export function useSecuritySessions() {
  const [sessions, setSessions] = useState<SecuritySession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await securitySessionsApi.list();
      setSessions(response.data.sessions);
    } catch (error) {
      setErrorMessage(getFriendlyApiError(error, "loadSessions"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const revokeSession = useCallback(async (id: string) => {
    const response = await securitySessionsApi.revoke(id);
    setSessions((current) => current.filter((session) => session.id !== id));
    return response.data;
  }, []);

  const logoutOtherSessions = useCallback(async () => {
    const response = await securitySessionsApi.logoutOthers();
    setSessions((current) => current.filter((session) => session.isCurrent));
    return response.data;
  }, []);

  return {
    sessions,
    isLoading,
    errorMessage,
    reload: loadSessions,
    revokeSession,
    logoutOtherSessions
  };
}
