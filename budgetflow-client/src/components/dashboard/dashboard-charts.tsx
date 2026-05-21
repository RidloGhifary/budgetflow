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

import { SectionCard } from "@/components/shared/section-card";
import { formatCurrency } from "@/lib/format";
import type { DashboardExpenseCategory, DashboardMonthlyFlow } from "@/types/api";

interface DashboardChartsProps {
  expenseByCategory: DashboardExpenseCategory[];
  incomeVsExpense: DashboardMonthlyFlow[];
}

function currencyTick(value: number) {
  if (value >= 1000000) {
    return `${value / 1000000}M`;
  }

  return `${value / 1000}K`;
}

export function DashboardCharts({ expenseByCategory, incomeVsExpense }: DashboardChartsProps) {
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
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
      <SectionCard title="Income vs Expense" description="Monthly movement across the last six months.">
        <div className="h-[320px]">
          {hasFlowData ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={flowData} margin={{ left: -12, right: 8, top: 8 }}>
                <CartesianGrid stroke="#E5EAE7" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="monthLabel" axisLine={false} tickLine={false} tick={{ fill: "#7B8794", fontSize: 12 }} />
                <YAxis
                  axisLine={false}
                  tickFormatter={currencyTick}
                  tickLine={false}
                  tick={{ fill: "#7B8794", fontSize: 12 }}
                />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} cursor={{ fill: "#E7F7F2" }} />
                <Legend iconType="circle" />
                <Bar dataKey="income" name="Income" fill="#007F68" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expense" name="Expense" fill="#EF4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChartState message="No monthly movement yet." />
          )}
        </div>
      </SectionCard>

      <SectionCard title="Expense by Category" description="Where spending is concentrated this month.">
        <div className="h-[320px]">
          {hasCategoryData ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
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
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend iconType="circle" layout="horizontal" verticalAlign="bottom" />
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

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 px-4 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
