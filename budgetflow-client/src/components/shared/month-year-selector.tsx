"use client";

import { CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MonthYearSelectorProps {
  disabled?: boolean;
  month: number;
  onChange: (value: { month: number; year: number }) => void;
  year: number;
}

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

const selectClassName =
  "h-10 rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50";

export function MonthYearSelector({ disabled = false, month, onChange, year }: MonthYearSelectorProps) {
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 7 }, (_, index) => currentYear - 4 + index);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1 shadow-sm">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <select
          aria-label="Month"
          className={cn(selectClassName, "border-0 bg-transparent px-1 shadow-none focus:ring-0")}
          disabled={disabled}
          onChange={(event) => onChange({ month: Number(event.target.value), year })}
          value={month}
        >
          {monthNames.map((label, index) => (
            <option key={label} value={index + 1}>
              {label}
            </option>
          ))}
        </select>
        <select
          aria-label="Year"
          className={cn(selectClassName, "w-[88px] border-0 bg-transparent px-1 shadow-none focus:ring-0")}
          disabled={disabled}
          onChange={(event) => onChange({ month, year: Number(event.target.value) })}
          value={year}
        >
          {yearOptions.map((yearOption) => (
            <option key={yearOption} value={yearOption}>
              {yearOption}
            </option>
          ))}
        </select>
      </div>
      <Button disabled={disabled} onClick={() => onChange(getCurrentMonthYear())} type="button" variant="outline">
        This Month
      </Button>
    </div>
  );
}

export function getCurrentMonthYear() {
  const date = new Date();

  return {
    month: date.getMonth() + 1,
    year: date.getFullYear()
  };
}

export function formatMonthYear(month: number, year: number) {
  return `${monthNames[month - 1] ?? "Month"} ${year}`;
}
