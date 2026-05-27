"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { calendarApi, type CalendarDayFilters, type CalendarSummaryFilters } from "@/lib/api/calendar.api";
import { getFriendlyApiError } from "@/lib/api/http";
import type { CalendarDayDetail, CalendarSummary } from "@/types/api";

export function useCalendarSummary(filters: CalendarSummaryFilters) {
  const [calendar, setCalendar] = useState<CalendarSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);

  const loadCalendar = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await calendarApi.summary(filters);
      setCalendar(response.data.calendar);
    } catch (error) {
      setErrorMessage(getFriendlyApiError(error, "loadCalendar"));
    } finally {
      setIsLoading(false);
    }
  }, [filterKey, filters]);

  useEffect(() => {
    void loadCalendar();
  }, [loadCalendar]);

  return {
    calendar,
    errorMessage,
    isLoading,
    reload: loadCalendar
  };
}

export function useCalendarDayDetail(filters: CalendarDayFilters | null) {
  const [day, setDay] = useState<CalendarDayDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);

  const loadDay = useCallback(async () => {
    if (!filters) {
      setDay(null);
      setErrorMessage(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await calendarApi.day(filters);
      setDay(response.data.day);
    } catch (error) {
      setErrorMessage(getFriendlyApiError(error, "loadCalendar"));
    } finally {
      setIsLoading(false);
    }
  }, [filterKey, filters]);

  useEffect(() => {
    void loadDay();
  }, [loadDay]);

  return {
    day,
    errorMessage,
    isLoading,
    reload: loadDay
  };
}
