"use client";

import { Search } from "lucide-react";

import { ActiveFilterChips, FilterField, FilterPanel, filterSelectClassName, type FilterGroup } from "@/components/shared/filter-panel";
import { Input } from "@/components/ui/input";
import type { DebtFilters } from "@/lib/api/debts.api";
import { debtStatusLabels, debtTypeLabels } from "@/lib/labels";
import { debtStatusValues } from "@/lib/validation/debts";
import type { DebtType } from "@/types/api";

interface DebtFiltersProps {
  filters: DebtFilters;
  hasActiveFilters: boolean;
  isLoading: boolean;
  onChange: (filters: DebtFilters) => void;
  onClear: () => void;
}

const emptyFilters: DebtFilters = {
  type: "",
  status: "",
  search: "",
  dueBefore: "",
  dueAfter: ""
};

const debtTypeValues: DebtType[] = ["I_OWE", "OWED_TO_ME"];

export function DebtFilters({ filters, hasActiveFilters, isLoading, onChange, onClear }: DebtFiltersProps) {
  const chips = getDebtFilterChips(filters);
  const groups: Array<FilterGroup<DebtFilters>> = [
    {
      id: "type",
      title: "Type",
      summary: filters.type ? debtTypeLabels[filters.type] : "All debt types",
      render: (draft, setDraft) => (
        <FilterField label="Debt Type">
          <select
            className={filterSelectClassName}
            disabled={isLoading}
            onChange={(event) => setDraft({ ...draft, type: event.target.value as DebtFilters["type"] })}
            value={draft.type ?? ""}
          >
            <option value="">All types</option>
            {debtTypeValues.map((type) => (
              <option key={type} value={type}>
                {debtTypeLabels[type]}
              </option>
            ))}
          </select>
        </FilterField>
      )
    },
    {
      id: "status",
      title: "Status",
      summary: filters.status ? debtStatusLabels[filters.status] : "All statuses",
      render: (draft, setDraft) => (
        <FilterField label="Status">
          <select
            className={filterSelectClassName}
            disabled={isLoading}
            onChange={(event) => setDraft({ ...draft, status: event.target.value as DebtFilters["status"] })}
            value={draft.status ?? ""}
          >
            <option value="">All statuses</option>
            {debtStatusValues.map((status) => (
              <option key={status} value={status}>
                {debtStatusLabels[status]}
              </option>
            ))}
          </select>
        </FilterField>
      )
    },
    {
      id: "due-date",
      title: "Due Date",
      summary: filters.dueAfter || filters.dueBefore ? `${filters.dueAfter || "Any"} to ${filters.dueBefore || "Any"}` : "Any due date",
      render: (draft, setDraft) => (
        <div className="grid gap-3 sm:grid-cols-2">
          <FilterField label="Due After">
            <Input disabled={isLoading} onChange={(event) => setDraft({ ...draft, dueAfter: event.target.value })} type="date" value={draft.dueAfter ?? ""} />
          </FilterField>
          <FilterField label="Due Before">
            <Input disabled={isLoading} onChange={(event) => setDraft({ ...draft, dueBefore: event.target.value })} type="date" value={draft.dueBefore ?? ""} />
          </FilterField>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-soft">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <label className="relative block flex-1">
          <span className="sr-only">Search debts</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            disabled={isLoading}
            onChange={(event) => onChange({ ...filters, search: event.target.value })}
            placeholder="Search title, person, or note"
            value={filters.search ?? ""}
          />
        </label>
        <FilterPanel activeCount={chips.length} disabled={isLoading} draft={filters} groups={groups} onApply={onChange} onReset={() => ({ ...emptyFilters, search: filters.search ?? "" })} />
      </div>
      <ActiveFilterChips chips={chips} onClear={hasActiveFilters ? onClear : undefined} />
    </div>
  );
}

function getDebtFilterChips(filters: DebtFilters) {
  const chips: string[] = [];

  if (filters.search) chips.push(`Search: ${filters.search}`);
  if (filters.type) chips.push(`Type: ${debtTypeLabels[filters.type]}`);
  if (filters.status) chips.push(`Status: ${debtStatusLabels[filters.status]}`);
  if (filters.dueAfter) chips.push(`Due after: ${filters.dueAfter}`);
  if (filters.dueBefore) chips.push(`Due before: ${filters.dueBefore}`);

  return chips;
}
