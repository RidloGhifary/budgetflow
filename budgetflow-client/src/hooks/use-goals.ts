"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { goalsApi, type SavingContributionInput, type SavingGoalFilters, type SavingGoalInput } from "@/lib/api/goals.api";
import { getFriendlyApiError } from "@/lib/api/http";
import type { SavingGoal, SavingGoalDetail, SavingGoalSummary } from "@/types/api";

export function useGoals(filters: SavingGoalFilters) {
  const [goals, setGoals] = useState<SavingGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);

  const loadGoals = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await goalsApi.list(filters);
      setGoals(response.data.goals);
    } catch (error) {
      setErrorMessage(getFriendlyApiError(error, "loadGoals"));
    } finally {
      setIsLoading(false);
    }
  }, [filterKey, filters]);

  useEffect(() => {
    void loadGoals();
  }, [loadGoals]);

  const createGoal = useCallback(
    async (input: SavingGoalInput) => {
      const response = await goalsApi.create(input);
      await loadGoals();
      return response.data.goal;
    },
    [loadGoals]
  );

  const updateGoal = useCallback(
    async (id: string, input: SavingGoalInput) => {
      const response = await goalsApi.update(id, input);
      await loadGoals();
      return response.data.goal;
    },
    [loadGoals]
  );

  const deleteGoal = useCallback(
    async (id: string) => {
      await goalsApi.delete(id);
      await loadGoals();
    },
    [loadGoals]
  );

  const addContribution = useCallback(
    async (id: string, input: SavingContributionInput) => {
      const response = await goalsApi.addContribution(id, input);
      await loadGoals();
      return response.data;
    },
    [loadGoals]
  );

  return {
    goals,
    isLoading,
    errorMessage,
    reload: loadGoals,
    createGoal,
    updateGoal,
    deleteGoal,
    addContribution
  };
}

export function useGoalSummary() {
  const [summary, setSummary] = useState<SavingGoalSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await goalsApi.summary();
      setSummary(response.data.summary);
    } catch (error) {
      setErrorMessage(getFriendlyApiError(error, "loadGoals"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  return {
    summary,
    isLoading,
    errorMessage,
    reload: loadSummary
  };
}

export function useGoalDetail(goalId: string | null) {
  const [goal, setGoal] = useState<SavingGoalDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadGoal = useCallback(async () => {
    if (!goalId) {
      setGoal(null);
      setErrorMessage(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await goalsApi.get(goalId);
      setGoal(response.data.goal);
    } catch (error) {
      setGoal(null);
      setErrorMessage(getFriendlyApiError(error, "loadGoals"));
    } finally {
      setIsLoading(false);
    }
  }, [goalId]);

  useEffect(() => {
    void loadGoal();
  }, [loadGoal]);

  return {
    goal,
    isLoading,
    errorMessage,
    reload: loadGoal
  };
}
