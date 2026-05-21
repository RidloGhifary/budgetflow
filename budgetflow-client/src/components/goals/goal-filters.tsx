"use client";

import { Search } from "lucide-react";

import { ActiveFilterChips, FilterField, FilterPanel, filterSelectClassName, type FilterGroup } from "@/components/shared/filter-panel";
import { Input } from "@/components/ui/input";
import type { SavingGoalFilters } from "@/lib/api/goals.api";
import { savingGoalStatusLabels } from "@/lib/labels";
import { savingGoalStatusValues } from "@/lib/validation/goals";

interface GoalFiltersProps {
  filters: SavingGoalFilters;
  hasActiveFilters: boolean;
  isLoading: boolean;
  onChange: (filters: SavingGoalFilters) => void;
  onClear: () => void;
}

const emptyFilters: SavingGoalFilters = {
  status: "",
  search: "",
  deadlineBefore: "",
  deadlineAfter: ""
};

export function GoalFilters({ filters, hasActiveFilters, isLoading, onChange, onClear }: GoalFiltersProps) {
  const chips = getGoalFilterChips(filters);
  const groups: Array<FilterGroup<SavingGoalFilters>> = [
    {
      id: "status",
      title: "Status",
      summary: filters.status ? savingGoalStatusLabels[filters.status] : "All statuses",
      render: (draft, setDraft) => (
        <FilterField label="Status">
          <select
            className={filterSelectClassName}
            disabled={isLoading}
            onChange={(event) => setDraft({ ...draft, status: event.target.value as SavingGoalFilters["status"] })}
            value={draft.status ?? ""}
          >
            <option value="">All statuses</option>
            {savingGoalStatusValues.map((status) => (
              <option key={status} value={status}>
                {savingGoalStatusLabels[status]}
              </option>
            ))}
          </select>
        </FilterField>
      )
    },
    {
      id: "deadline",
      title: "Deadline",
      summary: filters.deadlineAfter || filters.deadlineBefore ? `${filters.deadlineAfter || "Any"} to ${filters.deadlineBefore || "Any"}` : "Any deadline",
      render: (draft, setDraft) => (
        <div className="grid gap-3 sm:grid-cols-2">
          <FilterField label="Deadline After">
            <Input disabled={isLoading} onChange={(event) => setDraft({ ...draft, deadlineAfter: event.target.value })} type="date" value={draft.deadlineAfter ?? ""} />
          </FilterField>
          <FilterField label="Deadline Before">
            <Input disabled={isLoading} onChange={(event) => setDraft({ ...draft, deadlineBefore: event.target.value })} type="date" value={draft.deadlineBefore ?? ""} />
          </FilterField>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-soft">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <label className="relative block flex-1">
          <span className="sr-only">Search saving goals</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            disabled={isLoading}
            onChange={(event) => onChange({ ...filters, search: event.target.value })}
            placeholder="Search goal name or note"
            value={filters.search ?? ""}
          />
        </label>
        <FilterPanel activeCount={chips.length} disabled={isLoading} draft={filters} groups={groups} onApply={onChange} onReset={() => ({ ...emptyFilters, search: filters.search ?? "" })} />
      </div>
      <ActiveFilterChips chips={chips} onClear={hasActiveFilters ? onClear : undefined} />
    </div>
  );
}

function getGoalFilterChips(filters: SavingGoalFilters) {
  const chips: string[] = [];

  if (filters.search) chips.push(`Search: ${filters.search}`);
  if (filters.status) chips.push(`Status: ${savingGoalStatusLabels[filters.status]}`);
  if (filters.deadlineAfter) chips.push(`Deadline after: ${filters.deadlineAfter}`);
  if (filters.deadlineBefore) chips.push(`Deadline before: ${filters.deadlineBefore}`);

  return chips;
}
