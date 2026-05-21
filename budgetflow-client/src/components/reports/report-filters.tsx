"use client";

import { Search } from "lucide-react";

import { ActiveFilterChips, FilterField, FilterPanel, filterSelectClassName, type FilterGroup } from "@/components/shared/filter-panel";
import { Input } from "@/components/ui/input";
import type { ReportFilterState } from "@/hooks/use-reports";
import {
  categoryTypeLabels,
  debtStatusLabels,
  debtTypeLabels,
  savingGoalStatusLabels,
  transactionPurposeLabels,
  transactionTypeLabels
} from "@/lib/labels";
import type { Category, ReportType, Wallet } from "@/types/api";

interface ReportFiltersProps {
  categories: Category[];
  categoryError?: string | null;
  filters: ReportFilterState;
  isCategoriesLoading: boolean;
  isWalletsLoading: boolean;
  onChange: (filters: ReportFilterState | ((current: ReportFilterState) => ReportFilterState)) => void;
  reportType: ReportType;
  walletError?: string | null;
  wallets: Wallet[];
}

const monthOptions = Array.from({ length: 12 }, (_, index) => index + 1);

export function ReportFilters({
  categories,
  categoryError,
  filters,
  isCategoriesLoading,
  isWalletsLoading,
  onChange,
  reportType,
  walletError,
  wallets
}: ReportFiltersProps) {
  const chips = getReportFilterChips(reportType, filters, categories, wallets);
  const groups = getReportFilterGroups({
    categories,
    categoryError,
    filters,
    isCategoriesLoading,
    isWalletsLoading,
    reportType,
    walletError,
    wallets
  });

  const updateSearch = (value: string) => {
    if (reportType === "transactions") {
      onChange({ ...filters, transactions: { ...filters.transactions, search: value } });
    }

    if (reportType === "debts") {
      onChange({ ...filters, debts: { ...filters.debts, search: value } });
    }

    if (reportType === "goals") {
      onChange({ ...filters, goals: { ...filters.goals, search: value } });
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-soft">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        {hasSearch(reportType) ? (
          <label className="relative block flex-1">
            <span className="sr-only">Search report records</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" onChange={(event) => updateSearch(event.target.value)} placeholder={getSearchPlaceholder(reportType)} value={getSearchValue(reportType, filters)} />
          </label>
        ) : (
          <p className="flex-1 text-sm text-muted-foreground">Use filters to adjust the report preview.</p>
        )}
        <FilterPanel
          activeCount={chips.length}
          draft={filters}
          groups={groups}
          onApply={onChange}
          onReset={() => ({ ...filters, [reportType]: getClearedFilters(reportType, filters) })}
        />
      </div>

      <ActiveFilterChips chips={chips} onClear={() => onChange({ ...filters, [reportType]: getClearedFilters(reportType, filters) })} />
      <FilterMessages categoryError={categoryError} walletError={walletError} />
    </div>
  );
}

function getReportFilterGroups({
  categories,
  categoryError,
  filters,
  isCategoriesLoading,
  isWalletsLoading,
  reportType,
  walletError,
  wallets
}: {
  categories: Category[];
  categoryError?: string | null;
  filters: ReportFilterState;
  isCategoriesLoading: boolean;
  isWalletsLoading: boolean;
  reportType: ReportType;
  walletError?: string | null;
  wallets: Wallet[];
}): Array<FilterGroup<ReportFilterState>> {
  if (reportType === "monthly") {
    return [periodGroup("monthly", filters.monthly.month, filters.monthly.year)];
  }

  if (reportType === "range") {
    return [
      {
        id: "date-range",
        title: "Date Range",
        summary: `${filters.range.startDate} to ${filters.range.endDate}`,
        render: (draft, setDraft) => (
          <div className="grid gap-3 sm:grid-cols-2">
            <FilterField label="Start Date">
              <Input onChange={(event) => setDraft({ ...draft, range: { ...draft.range, startDate: event.target.value } })} type="date" value={draft.range.startDate} />
            </FilterField>
            <FilterField label="End Date">
              <Input onChange={(event) => setDraft({ ...draft, range: { ...draft.range, endDate: event.target.value } })} type="date" value={draft.range.endDate} />
            </FilterField>
          </div>
        )
      }
    ];
  }

  if (reportType === "budgets") {
    return [periodGroup("budgets", filters.budgets.month, filters.budgets.year)];
  }

  if (reportType === "transactions") {
    return [
      selectGroup("Type", filters.transactions.type ? transactionTypeLabels[filters.transactions.type] : "All types", (draft, setDraft) => (
        <FilterField label="Type">
          <select
            className={filterSelectClassName}
            onChange={(event) => setDraft({ ...draft, transactions: { ...draft.transactions, type: event.target.value as ReportFilterState["transactions"]["type"] } })}
            value={draft.transactions.type ?? ""}
          >
            <option value="">All types</option>
            <option value="INCOME">{transactionTypeLabels.INCOME}</option>
            <option value="EXPENSE">{transactionTypeLabels.EXPENSE}</option>
          </select>
        </FilterField>
      )),
      selectGroup("Purpose", filters.transactions.purpose ? transactionPurposeLabels[filters.transactions.purpose] : "All purposes", (draft, setDraft) => (
        <FilterField label="Purpose">
          <select
            className={filterSelectClassName}
            onChange={(event) => setDraft({ ...draft, transactions: { ...draft.transactions, purpose: event.target.value as ReportFilterState["transactions"]["purpose"] } })}
            value={draft.transactions.purpose ?? ""}
          >
            <option value="">All purposes</option>
            {Object.entries(transactionPurposeLabels).map(([purpose, label]) => (
              <option key={purpose} value={purpose}>
                {label}
              </option>
            ))}
          </select>
        </FilterField>
      )),
      selectGroup("Wallet", getWalletName(filters.transactions.walletId, wallets) ?? "All wallets", (draft, setDraft) => (
        <FilterField label="Wallet">
          <select
            className={filterSelectClassName}
            disabled={isWalletsLoading || Boolean(walletError)}
            onChange={(event) => setDraft({ ...draft, transactions: { ...draft.transactions, walletId: event.target.value } })}
            value={draft.transactions.walletId ?? ""}
          >
            <option value="">{isWalletsLoading ? "Loading wallets..." : "All wallets"}</option>
            {wallets.map((wallet) => (
              <option key={wallet.id} value={wallet.id}>
                {wallet.name}
              </option>
            ))}
          </select>
        </FilterField>
      )),
      selectGroup("Category", getCategoryName(filters.transactions.categoryId, categories) ?? "All categories", (draft, setDraft) => (
        <FilterField label="Category">
          <select
            className={filterSelectClassName}
            disabled={isCategoriesLoading || Boolean(categoryError)}
            onChange={(event) => setDraft({ ...draft, transactions: { ...draft.transactions, categoryId: event.target.value } })}
            value={draft.transactions.categoryId ?? ""}
          >
            <option value="">{isCategoriesLoading ? "Loading categories..." : "All categories"}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name} ({categoryTypeLabels[category.type]})
              </option>
            ))}
          </select>
        </FilterField>
      )),
      periodGroup("transactions", filters.transactions.month, filters.transactions.year, true),
      transactionDateRangeGroup(filters)
    ];
  }

  if (reportType === "debts") {
    return [
      selectGroup("Type", filters.debts.type ? debtTypeLabels[filters.debts.type] : "All types", (draft, setDraft) => (
        <FilterField label="Type">
          <select
            className={filterSelectClassName}
            onChange={(event) => setDraft({ ...draft, debts: { ...draft.debts, type: event.target.value as ReportFilterState["debts"]["type"] } })}
            value={draft.debts.type ?? ""}
          >
            <option value="">All types</option>
            {Object.entries(debtTypeLabels).map(([type, label]) => (
              <option key={type} value={type}>
                {label}
              </option>
            ))}
          </select>
        </FilterField>
      )),
      selectGroup("Status", filters.debts.status ? debtStatusLabels[filters.debts.status] : "All statuses", (draft, setDraft) => (
        <FilterField label="Status">
          <select
            className={filterSelectClassName}
            onChange={(event) => setDraft({ ...draft, debts: { ...draft.debts, status: event.target.value as ReportFilterState["debts"]["status"] } })}
            value={draft.debts.status ?? ""}
          >
            <option value="">All statuses</option>
            {Object.entries(debtStatusLabels).map(([status, label]) => (
              <option key={status} value={status}>
                {label}
              </option>
            ))}
          </select>
        </FilterField>
      )),
      dateRangeGroup("Due Date", "dueAfter", "dueBefore", filters.debts.dueAfter, filters.debts.dueBefore, "debts")
    ];
  }

  return [
    selectGroup("Status", filters.goals.status ? savingGoalStatusLabels[filters.goals.status] : "All statuses", (draft, setDraft) => (
      <FilterField label="Status">
        <select
          className={filterSelectClassName}
          onChange={(event) => setDraft({ ...draft, goals: { ...draft.goals, status: event.target.value as ReportFilterState["goals"]["status"] } })}
          value={draft.goals.status ?? ""}
        >
          <option value="">All statuses</option>
          {Object.entries(savingGoalStatusLabels).map(([status, label]) => (
            <option key={status} value={status}>
              {label}
            </option>
          ))}
        </select>
      </FilterField>
    )),
    dateRangeGroup("Deadline", "deadlineAfter", "deadlineBefore", filters.goals.deadlineAfter, filters.goals.deadlineBefore, "goals")
  ];
}

function selectGroup(title: string, summary: string, render: FilterGroup<ReportFilterState>["render"]): FilterGroup<ReportFilterState> {
  return { id: title.toLowerCase().replace(/\s+/g, "-"), title, summary, render };
}

function periodGroup(section: "monthly" | "budgets" | "transactions", month?: number | "", year?: number | "", allowEmpty = false): FilterGroup<ReportFilterState> {
  return {
    id: "period",
    title: "Period",
    summary: [month ? `Month ${month}` : allowEmpty ? "All months" : "Month required", year ? `${year}` : allowEmpty ? "Any year" : "Year required"].join(", "),
    render: (draft, setDraft) => (
      <div className="grid gap-3 sm:grid-cols-2">
        <FilterField label="Month">
          <select
            className={filterSelectClassName}
            onChange={(event) => {
              const nextMonth = event.target.value ? Number(event.target.value) : "";
              setDraft({ ...draft, [section]: { ...draft[section], month: nextMonth } });
            }}
            value={draft[section].month ? String(draft[section].month) : ""}
          >
            {allowEmpty ? <option value="">All months</option> : null}
            {monthOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Year">
          <Input
            max="2100"
            min="2000"
            onChange={(event) => {
              const nextYear = event.target.value ? Number(event.target.value) : "";
              setDraft({ ...draft, [section]: { ...draft[section], year: nextYear } });
            }}
            type="number"
            value={draft[section].year ? String(draft[section].year) : ""}
          />
        </FilterField>
      </div>
    )
  };
}

function transactionDateRangeGroup(filters: ReportFilterState): FilterGroup<ReportFilterState> {
  return {
    id: "date-range",
    title: "Date Range",
    summary: filters.transactions.startDate || filters.transactions.endDate ? `${filters.transactions.startDate || "Any"} to ${filters.transactions.endDate || "Any"}` : "Any date",
    render: (draft, setDraft) => (
      <div className="grid gap-3 sm:grid-cols-2">
        <FilterField label="Start Date">
          <Input onChange={(event) => setDraft({ ...draft, transactions: { ...draft.transactions, startDate: event.target.value } })} type="date" value={draft.transactions.startDate ?? ""} />
        </FilterField>
        <FilterField label="End Date">
          <Input onChange={(event) => setDraft({ ...draft, transactions: { ...draft.transactions, endDate: event.target.value } })} type="date" value={draft.transactions.endDate ?? ""} />
        </FilterField>
      </div>
    )
  };
}

function dateRangeGroup(
  title: string,
  startKey: "dueAfter" | "deadlineAfter",
  endKey: "dueBefore" | "deadlineBefore",
  startValue: string | undefined,
  endValue: string | undefined,
  section: "debts" | "goals"
): FilterGroup<ReportFilterState> {
  return {
    id: title.toLowerCase().replace(/\s+/g, "-"),
    title,
    summary: startValue || endValue ? `${startValue || "Any"} to ${endValue || "Any"}` : `Any ${title.toLowerCase()}`,
    render: (draft, setDraft) => (
      <div className="grid gap-3 sm:grid-cols-2">
        <FilterField label={`${title} After`}>
          <Input
            onChange={(event) => setDraft({ ...draft, [section]: { ...draft[section], [startKey]: event.target.value } })}
            type="date"
            value={(draft[section] as Record<string, string | undefined>)[startKey] ?? ""}
          />
        </FilterField>
        <FilterField label={`${title} Before`}>
          <Input
            onChange={(event) => setDraft({ ...draft, [section]: { ...draft[section], [endKey]: event.target.value } })}
            type="date"
            value={(draft[section] as Record<string, string | undefined>)[endKey] ?? ""}
          />
        </FilterField>
      </div>
    )
  };
}

function getReportFilterChips(reportType: ReportType, filters: ReportFilterState, categories: Category[], wallets: Wallet[]) {
  const chips: string[] = [];

  if (reportType === "monthly") {
    chips.push(`Month: ${filters.monthly.month}`, `Year: ${filters.monthly.year}`);
  }

  if (reportType === "range") {
    chips.push(`From: ${filters.range.startDate}`, `To: ${filters.range.endDate}`);
  }

  if (reportType === "budgets") {
    chips.push(`Month: ${filters.budgets.month}`, `Year: ${filters.budgets.year}`);
  }

  if (reportType === "transactions") {
    const current = filters.transactions;
    if (current.search) chips.push(`Search: ${current.search}`);
    if (current.type) chips.push(`Type: ${transactionTypeLabels[current.type]}`);
    if (current.purpose) chips.push(`Purpose: ${transactionPurposeLabels[current.purpose]}`);
    if (current.walletId) chips.push(`Wallet: ${getWalletName(current.walletId, wallets) ?? "Selected"}`);
    if (current.categoryId) chips.push(`Category: ${getCategoryName(current.categoryId, categories) ?? "Selected"}`);
    if (current.month) chips.push(`Month: ${current.month}`);
    if (current.year) chips.push(`Year: ${current.year}`);
    if (current.startDate) chips.push(`From: ${current.startDate}`);
    if (current.endDate) chips.push(`To: ${current.endDate}`);
  }

  if (reportType === "debts") {
    const current = filters.debts;
    if (current.search) chips.push(`Search: ${current.search}`);
    if (current.type) chips.push(`Type: ${debtTypeLabels[current.type]}`);
    if (current.status) chips.push(`Status: ${debtStatusLabels[current.status]}`);
    if (current.dueAfter) chips.push(`Due after: ${current.dueAfter}`);
    if (current.dueBefore) chips.push(`Due before: ${current.dueBefore}`);
  }

  if (reportType === "goals") {
    const current = filters.goals;
    if (current.search) chips.push(`Search: ${current.search}`);
    if (current.status) chips.push(`Status: ${savingGoalStatusLabels[current.status]}`);
    if (current.deadlineAfter) chips.push(`Deadline after: ${current.deadlineAfter}`);
    if (current.deadlineBefore) chips.push(`Deadline before: ${current.deadlineBefore}`);
  }

  return chips;
}

function getSearchValue(reportType: ReportType, filters: ReportFilterState) {
  if (reportType === "transactions") return filters.transactions.search ?? "";
  if (reportType === "debts") return filters.debts.search ?? "";
  if (reportType === "goals") return filters.goals.search ?? "";
  return "";
}

function getSearchPlaceholder(reportType: ReportType) {
  if (reportType === "transactions") return "Search note, category, or wallet";
  if (reportType === "debts") return "Search title, person, or note";
  return "Search goal name or note";
}

function hasSearch(reportType: ReportType) {
  return reportType === "transactions" || reportType === "debts" || reportType === "goals";
}

function getClearedFilters(reportType: ReportType, current: ReportFilterState) {
  switch (reportType) {
    case "monthly":
      return current.monthly;
    case "range":
      return current.range;
    case "transactions":
      return {};
    case "budgets":
      return current.budgets;
    case "debts":
      return {};
    case "goals":
      return {};
  }
}

function getWalletName(walletId: string | undefined, wallets: Wallet[]) {
  return wallets.find((wallet) => wallet.id === walletId)?.name;
}

function getCategoryName(categoryId: string | undefined, categories: Category[]) {
  return categories.find((category) => category.id === categoryId)?.name;
}

function FilterMessages({ categoryError, walletError }: { categoryError?: string | null; walletError?: string | null }) {
  if (!categoryError && !walletError) {
    return null;
  }

  return (
    <div className="space-y-2">
      {walletError ? <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-800">{walletError}</p> : null}
      {categoryError ? <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-800">{categoryError}</p> : null}
    </div>
  );
}
