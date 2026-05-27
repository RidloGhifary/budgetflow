"use client";

import { useMemo, useState } from "react";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  FilterX,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  WalletCards
} from "lucide-react";

import { CalendarDayDetailPanel } from "@/components/calendar/calendar-day-detail-panel";
import { CalendarMonthGrid } from "@/components/calendar/calendar-month-grid";
import { SensitiveValue } from "@/components/privacy/sensitive-value";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatTile } from "@/components/shared/stat-tile";
import { Button } from "@/components/ui/button";
import { useCalendarDayDetail, useCalendarSummary } from "@/hooks/use-calendar";
import { useCategories } from "@/hooks/use-categories";
import { useWallets } from "@/hooks/use-wallets";
import type { CalendarFilters } from "@/lib/api/calendar.api";
import {
  getCalendarGridDays,
  getCalendarRangeForMonthGrid,
  getCurrentMonthYear,
  getMonthTitle,
  shiftMonth,
  toDateKey
} from "@/lib/calendar";
import { transactionTypeLabels } from "@/lib/labels";
import type { CalendarDaySummary, TransactionType } from "@/types/api";

const defaultFilters: CalendarFilters = {
  categoryId: "",
  includeRecurring: true,
  type: "",
  walletId: ""
};

const selectClassName =
  "flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50";

export default function CalendarPage() {
  const today = toDateKey(new Date());
  const [visibleMonth, setVisibleMonth] = useState(getCurrentMonthYear);
  const [selectedDate, setSelectedDate] = useState(today);
  const [filters, setFilters] = useState<CalendarFilters>(defaultFilters);
  const [detailPage, setDetailPage] = useState(1);
  const [detailPageSize, setDetailPageSize] = useState(20);
  const gridDays = useMemo(
    () => getCalendarGridDays(visibleMonth.month, visibleMonth.year),
    [visibleMonth.month, visibleMonth.year]
  );
  const calendarRange = useMemo(
    () => getCalendarRangeForMonthGrid(visibleMonth.month, visibleMonth.year),
    [visibleMonth.month, visibleMonth.year]
  );
  const summaryFilters = useMemo(
    () => ({
      ...filters,
      endDate: calendarRange.endDate,
      startDate: calendarRange.startDate
    }),
    [calendarRange.endDate, calendarRange.startDate, filters]
  );
  const dayFilters = useMemo(
    () => ({
      ...filters,
      date: selectedDate,
      page: detailPage,
      pageSize: detailPageSize
    }),
    [detailPage, detailPageSize, filters, selectedDate]
  );
  const { calendar, errorMessage, isLoading, reload } = useCalendarSummary(summaryFilters);
  const {
    day,
    errorMessage: dayError,
    isLoading: isDayLoading,
    reload: reloadDay
  } = useCalendarDayDetail(dayFilters);
  const { wallets, isLoading: isWalletsLoading } = useWallets();
  const { categories, isLoading: isCategoriesLoading } = useCategories();
  const summariesByDate = useMemo(() => new Map((calendar?.days ?? []).map((summary) => [summary.date, summary])), [calendar?.days]);
  const monthlySummary = useMemo(
    () => getMonthlySummary(gridDays.filter((day) => day.isCurrentMonth).map((day) => summariesByDate.get(day.dateKey))),
    [gridDays, summariesByDate]
  );
  const matchingCategories = useMemo(
    () => categories.filter((category) => !filters.type || category.type === filters.type),
    [categories, filters.type]
  );
  const hasActiveFilters = Boolean(filters.type || filters.walletId || filters.categoryId || filters.includeRecurring === false);

  const updateFilters = (patch: Partial<CalendarFilters>) => {
    setFilters((current) => ({
      ...current,
      ...patch,
      categoryId: patch.type && patch.type !== current.type ? "" : patch.categoryId ?? current.categoryId
    }));
    setDetailPage(1);
  };

  const navigateMonth = (offset: number) => {
    const nextMonth = shiftMonth(visibleMonth.month, visibleMonth.year, offset);

    setVisibleMonth(nextMonth);
    setSelectedDate(`${nextMonth.year}-${String(nextMonth.month).padStart(2, "0")}-01`);
    setDetailPage(1);
  };

  const goToToday = () => {
    const current = getCurrentMonthYear();

    setVisibleMonth(current);
    setSelectedDate(today);
    setDetailPage(1);
  };

  const selectDate = (dateKey: string) => {
    setSelectedDate(dateKey);
    setDetailPage(1);
  };

  const reloadCalendar = async () => {
    await Promise.all([reload(), reloadDay()]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        description="See real transactions and upcoming recurring activity by date."
        actions={
          <>
            <Button disabled={isLoading} onClick={() => navigateMonth(-1)} size="icon" type="button" variant="outline" aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-[190px] rounded-md border border-border bg-card px-4 py-2 text-center text-sm font-semibold text-foreground">
              {getMonthTitle(visibleMonth.month, visibleMonth.year)}
            </div>
            <Button disabled={isLoading} onClick={() => navigateMonth(1)} size="icon" type="button" variant="outline" aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button disabled={isLoading} onClick={goToToday} type="button" variant="outline">
              Today
            </Button>
            <Button disabled={isLoading || isDayLoading} onClick={() => void reloadCalendar()} type="button" variant="outline">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Income"
          value={<SensitiveValue format="currency" value={monthlySummary.incomeTotal} />}
          helper={`${monthlySummary.incomeCount} income transaction${monthlySummary.incomeCount === 1 ? "" : "s"}`}
          icon={TrendingUp}
          tone="success"
        />
        <StatTile
          label="Expense"
          value={<SensitiveValue format="currency" value={monthlySummary.expenseTotal} />}
          helper={`${monthlySummary.expenseCount} expense transaction${monthlySummary.expenseCount === 1 ? "" : "s"}`}
          icon={TrendingDown}
          tone="danger"
        />
        <StatTile
          label="Net"
          value={<SensitiveValue format="currency" value={monthlySummary.netTotal} />}
          helper={`${monthlySummary.transactionCount} total transaction${monthlySummary.transactionCount === 1 ? "" : "s"}`}
          icon={WalletCards}
          tone={monthlySummary.netTotal < 0 ? "danger" : "primary"}
        />
        <StatTile
          label="Scheduled"
          value={monthlySummary.recurringUpcomingCount}
          helper="Upcoming recurring items in this month"
          icon={CalendarClock}
          tone="blue"
        />
      </section>

      <SectionCard title="Filters" description="Filter calendar summaries and selected day details by wallet, category, type, or recurring previews.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Type</span>
            <select
              className={selectClassName}
              disabled={isLoading}
              onChange={(event) => updateFilters({ type: event.target.value as TransactionType | "" })}
              value={filters.type ?? ""}
            >
              <option value="">All types</option>
              <option value="INCOME">{transactionTypeLabels.INCOME}</option>
              <option value="EXPENSE">{transactionTypeLabels.EXPENSE}</option>
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Wallet</span>
            <select
              className={selectClassName}
              disabled={isLoading || isWalletsLoading}
              onChange={(event) => updateFilters({ walletId: event.target.value })}
              value={filters.walletId ?? ""}
            >
              <option value="">All wallets</option>
              {wallets.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {wallet.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Category</span>
            <select
              className={selectClassName}
              disabled={isLoading || isCategoriesLoading}
              onChange={(event) => updateFilters({ categoryId: event.target.value })}
              value={filters.categoryId ?? ""}
            >
              <option value="">All categories</option>
              {matchingCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground">
            <input
              checked={filters.includeRecurring !== false}
              className="h-4 w-4 accent-primary"
              disabled={isLoading}
              onChange={(event) => updateFilters({ includeRecurring: event.target.checked })}
              type="checkbox"
            />
            Show recurring previews
          </label>

          {hasActiveFilters ? (
            <Button className="self-end" disabled={isLoading} onClick={() => updateFilters(defaultFilters)} type="button" variant="outline">
              <FilterX className="h-4 w-4" />
              Clear filters
            </Button>
          ) : null}
        </div>
      </SectionCard>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
        <SectionCard
          title="Month View"
          description={monthlySummary.hasActivity ? "Select any day to inspect transactions and scheduled recurring items." : "No activity this month yet."}
        >
          {errorMessage ? (
            <div className="mb-4 rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
              <p>{errorMessage}</p>
              <Button className="mt-3" onClick={() => void reload()} type="button" variant="outline">
                Retry
              </Button>
            </div>
          ) : null}

          <CalendarMonthGrid
            days={gridDays}
            isLoading={isLoading}
            onSelectDate={selectDate}
            selectedDate={selectedDate}
            summariesByDate={summariesByDate}
          />
        </SectionCard>

        <CalendarDayDetailPanel
          day={day}
          errorMessage={dayError}
          isLoading={isDayLoading}
          onPageChange={setDetailPage}
          onPageSizeChange={(pageSize) => {
            setDetailPageSize(pageSize);
            setDetailPage(1);
          }}
          onRetry={() => void reloadDay()}
          selectedDate={selectedDate}
        />
      </section>
    </div>
  );
}

function getMonthlySummary(summaries: Array<CalendarDaySummary | undefined>) {
  return summaries.reduce(
    (total, summary) => {
      if (!summary) {
        return total;
      }

      total.expenseCount += summary.expenseCount;
      total.expenseTotal += summary.expenseTotal;
      total.hasActivity = total.hasActivity || summary.hasActivity;
      total.incomeCount += summary.incomeCount;
      total.incomeTotal += summary.incomeTotal;
      total.netTotal += summary.netTotal;
      total.recurringUpcomingCount += summary.recurringUpcomingCount;
      total.transactionCount += summary.transactionCount;

      return total;
    },
    {
      expenseCount: 0,
      expenseTotal: 0,
      hasActivity: false,
      incomeCount: 0,
      incomeTotal: 0,
      netTotal: 0,
      recurringUpcomingCount: 0,
      transactionCount: 0
    }
  );
}
