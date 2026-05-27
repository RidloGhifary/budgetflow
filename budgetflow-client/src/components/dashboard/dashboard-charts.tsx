"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { formatPrivacySafeValue } from "@/components/privacy/sensitive-value";
import { SectionCard } from "@/components/shared/section-card";
import { usePreferences } from "@/providers/preferences-provider";
import type { DashboardExpenseCategory, DashboardMonthlyFlow } from "@/types/api";

interface DashboardChartsProps {
  expenseByCategory: DashboardExpenseCategory[];
  incomeVsExpense: DashboardMonthlyFlow[];
}

interface ChartTooltipPayload {
  color?: string;
  dataKey?: string | number;
  name?: string | number;
  value?: number | string;
}

interface CurrencyTooltipProps {
  active?: boolean;
  label?: string;
  payload?: ChartTooltipPayload[];
  privacyModeEnabled: boolean;
}

const chartTheme = {
  axis: "hsl(var(--muted-foreground))",
  cursor: "hsl(var(--muted) / 0.5)",
  grid: "hsl(var(--border))",
  income: "#2DD4BF",
  expense: "#F87171"
};

function currencyTick(value: number) {
  if (value >= 1000000) {
    return `${value / 1000000}M`;
  }

  return `${value / 1000}K`;
}

export function DashboardCharts({ expenseByCategory, incomeVsExpense }: DashboardChartsProps) {
  const { privacyModeEnabled } = usePreferences();
  const formatChartCurrency = (value: number | string | null | undefined) =>
    formatPrivacySafeValue(value ?? 0, "currency", privacyModeEnabled);
  const flowData = incomeVsExpense.map((item) => ({
    ...item,
    monthLabel: item.label
  }));
  const categoryData = expenseByCategory.map((item) => ({
    id: item.categoryId,
    name: item.categoryName,
    value: item.totalAmount,
    color: item.color ?? "#007F68"
  }));
  const hasFlowData = flowData.some((item) => item.income > 0 || item.expense > 0);
  const hasCategoryData = categoryData.some((item) => item.value > 0);

  return (
    <div className="grid gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
      <SectionCard title="Income vs Expense" description="Monthly movement across the last six months.">
        <div
          aria-label={
            privacyModeEnabled
              ? "Income and expense chart. Financial amounts are hidden while privacy mode is on."
              : "Income and expense chart."
          }
          className="h-[260px] sm:h-[320px]"
        >
          {hasFlowData ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                accessibilityLayer={!privacyModeEnabled}
                data={flowData}
                margin={{ left: -12, right: 8, top: 8 }}
              >
                <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="monthLabel" axisLine={false} tickLine={false} tick={{ fill: chartTheme.axis, fontSize: 12 }} />
                <YAxis
                  axisLine={false}
                  tickFormatter={(value) => (privacyModeEnabled ? formatChartCurrency(value) : currencyTick(Number(value)))}
                  tickLine={false}
                  tick={{ fill: chartTheme.axis, fontSize: 12 }}
                />
                <Tooltip
                  content={<CurrencyTooltip privacyModeEnabled={privacyModeEnabled} />}
                  cursor={{ fill: chartTheme.cursor }}
                  wrapperStyle={{ outline: "none" }}
                />
                <Legend formatter={renderLegendLabel} iconType="circle" wrapperStyle={{ color: chartTheme.axis }} />
                <Bar dataKey="income" name="Income" fill={chartTheme.income} radius={[6, 6, 0, 0]} />
                <Bar dataKey="expense" name="Expense" fill={chartTheme.expense} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChartState message="No monthly movement yet." />
          )}
        </div>
      </SectionCard>

      <SectionCard title="Expense by Category" description="Where spending is concentrated this month.">
        <div
          aria-label={
            privacyModeEnabled
              ? "Expense category chart. Financial amounts are hidden while privacy mode is on."
              : "Expense category chart."
          }
          className="h-[260px] sm:h-[320px]"
        >
          {hasCategoryData ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart accessibilityLayer={!privacyModeEnabled}>
                <Pie
                  data={categoryData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={68}
                  outerRadius={102}
                  paddingAngle={3}
                >
                  {categoryData.map((entry) => (
                    <Cell key={entry.id} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={<CurrencyTooltip privacyModeEnabled={privacyModeEnabled} />}
                  wrapperStyle={{ outline: "none" }}
                />
                <Legend
                  formatter={renderLegendLabel}
                  iconType="circle"
                  layout="horizontal"
                  verticalAlign="bottom"
                  wrapperStyle={{ color: chartTheme.axis }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChartState message="No expense categories yet." />
          )}
        </div>
      </SectionCard>
    </div>
  );
}

function CurrencyTooltip({ active, label, payload, privacyModeEnabled }: CurrencyTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="min-w-36 rounded-lg border border-border bg-card/95 p-3 text-sm text-foreground shadow-soft backdrop-blur">
      {label ? <p className="mb-2 font-medium text-muted-foreground">{label}</p> : null}
      <div className="space-y-1.5">
        {payload.map((item) => {
          const name = String(item.name ?? item.dataKey ?? "Value");
          const value = formatPrivacySafeValue(getNumericValue(item.value), "currency", privacyModeEnabled);

          return (
            <div className="flex items-center justify-between gap-4" key={`${name}-${item.dataKey ?? item.value}`}>
              <span className="inline-flex min-w-0 items-center gap-2 text-muted-foreground">
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color ?? chartTheme.axis }}
                />
                <span className="truncate">{name}</span>
              </span>
              <span className="number-tabular whitespace-nowrap font-semibold text-foreground">{value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function renderLegendLabel(value: string | number) {
  return <span className="text-xs text-muted-foreground">{value}</span>;
}

function getNumericValue(value: ChartTooltipPayload["value"]) {
  const numericValue = typeof value === "number" ? value : Number(value);

  return Number.isFinite(numericValue) ? numericValue : 0;
}

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 px-4 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
