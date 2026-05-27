"use client";

import { CalendarClock } from "lucide-react";

import { SensitiveValue } from "@/components/privacy/sensitive-value";
import { Badge } from "@/components/ui/badge";
import { getWeekdayLabels, type CalendarGridDay } from "@/lib/calendar";
import { cn } from "@/lib/utils";
import type { CalendarDaySummary } from "@/types/api";

interface CalendarMonthGridProps {
  days: CalendarGridDay[];
  isLoading: boolean;
  onSelectDate: (dateKey: string) => void;
  selectedDate: string;
  summariesByDate: Map<string, CalendarDaySummary>;
}

export function CalendarMonthGrid({
  days,
  isLoading,
  onSelectDate,
  selectedDate,
  summariesByDate
}: CalendarMonthGridProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="grid grid-cols-7 border-b border-border bg-muted/40">
        {getWeekdayLabels().map((weekday) => (
          <div className="px-2 py-3 text-center text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground" key={weekday}>
            {weekday}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const summary = summariesByDate.get(day.dateKey);

          return (
            <CalendarDayCell
              day={day}
              isLoading={isLoading}
              isSelected={selectedDate === day.dateKey}
              key={day.dateKey}
              onSelectDate={onSelectDate}
              summary={summary}
            />
          );
        })}
      </div>
    </div>
  );
}

function CalendarDayCell({
  day,
  isLoading,
  isSelected,
  onSelectDate,
  summary
}: {
  day: CalendarGridDay;
  isLoading: boolean;
  isSelected: boolean;
  onSelectDate: (dateKey: string) => void;
  summary?: CalendarDaySummary;
}) {
  const hasTransactions = (summary?.transactionCount ?? 0) > 0;
  const hasRecurring = (summary?.recurringUpcomingCount ?? 0) > 0;
  const hasActivity = Boolean(summary?.hasActivity);

  return (
    <button
      aria-pressed={isSelected}
      aria-label={getDayAriaLabel(day.dateKey, summary)}
      className={cn(
        "min-h-[112px] border-b border-r border-border p-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:min-h-[136px]",
        !day.isCurrentMonth && "bg-muted/25 text-muted-foreground",
        day.isCurrentMonth && "bg-card hover:bg-muted/40",
        isSelected && "bg-secondary/70 ring-2 ring-inset ring-primary/30",
        day.isToday && "shadow-[inset_0_3px_0_0_hsl(var(--primary))]"
      )}
      disabled={isLoading}
      onClick={() => onSelectDate(day.dateKey)}
      type="button"
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn("flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold", day.isToday && "bg-primary text-primary-foreground")}>
          {day.date.getUTCDate()}
        </span>
        {hasActivity ? (
          <span className="flex items-center gap-1">
            {hasTransactions ? <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" /> : null}
            {hasRecurring ? <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" /> : null}
          </span>
        ) : null}
      </div>

      {isLoading ? (
        <div className="mt-4 space-y-2">
          <div className="h-3 w-16 animate-pulse rounded bg-muted" />
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
          <div className="h-3 w-14 animate-pulse rounded bg-muted" />
        </div>
      ) : hasActivity && summary ? (
        <div className="mt-3 space-y-1.5">
          <p className="hidden text-xs text-emerald-700 sm:block">
            Income <SensitiveValue className="min-w-0" format="currency" value={summary.incomeTotal} />
          </p>
          <p className="hidden text-xs text-red-700 sm:block">
            Expense <SensitiveValue className="min-w-0" format="currency" value={summary.expenseTotal} />
          </p>
          <p className={cn("hidden text-xs font-semibold sm:block", summary.netTotal < 0 ? "text-red-700" : "text-foreground")}>
            Net <SensitiveValue className="min-w-0" format="currency" value={summary.netTotal} />
          </p>
          <div className="flex flex-wrap gap-1 pt-1">
            {summary.transactionCount > 0 ? (
              <Badge variant="outline">{summary.transactionCount} tx</Badge>
            ) : null}
            {summary.recurringUpcomingCount > 0 ? (
              <Badge variant="warning">
                <CalendarClock className="mr-1 h-3 w-3" />
                {summary.recurringUpcomingCount}
              </Badge>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="mt-4 hidden text-xs text-muted-foreground sm:block">No activity</p>
      )}
    </button>
  );
}

function getDayAriaLabel(dateKey: string, summary?: CalendarDaySummary) {
  if (!summary?.hasActivity) {
    return `${dateKey}, no financial activity`;
  }

  return `${dateKey}, ${summary.transactionCount} transactions and ${summary.recurringUpcomingCount} upcoming recurring items`;
}
