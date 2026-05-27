"use client";

import { Activity, AlertTriangle, CheckCircle2, Info, RefreshCw, ShieldCheck } from "lucide-react";

import { SensitiveText } from "@/components/privacy/sensitive-value";
import { ProgressIndicator } from "@/components/shared/progress-indicator";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  FinancialHealth,
  FinancialHealthComponent,
  FinancialHealthComponentKey,
  FinancialHealthInsight,
  FinancialHealthInsightType,
  FinancialHealthStatus
} from "@/types/api";

interface FinancialHealthCardProps {
  errorMessage?: string | null;
  financialHealth: FinancialHealth | null;
  isLoading: boolean;
  onRetry: () => void;
}

const statusLabels: Record<FinancialHealthStatus, string> = {
  critical: "Critical",
  excellent: "Excellent",
  fair: "Fair",
  good: "Good",
  needs_attention: "Needs Attention",
  not_enough_data: "Not enough data"
};

const statusBadgeClass: Record<FinancialHealthStatus, string> = {
  critical: "bg-red-500/15 text-red-700 dark:text-red-200",
  excellent: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200",
  fair: "bg-amber-500/15 text-amber-700 dark:text-amber-200",
  good: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200",
  needs_attention: "bg-amber-500/15 text-amber-700 dark:text-amber-200",
  not_enough_data: "bg-muted text-muted-foreground"
};

const progressTone: Record<FinancialHealthStatus, "success" | "warning" | "danger" | "primary"> = {
  critical: "danger",
  excellent: "success",
  fair: "warning",
  good: "success",
  needs_attention: "warning",
  not_enough_data: "primary"
};

const insightBadgeClass: Record<FinancialHealthInsightType, string> = {
  critical: "bg-red-500/15 text-red-700 dark:text-red-200",
  neutral: "bg-muted text-muted-foreground",
  positive: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200",
  warning: "bg-amber-500/15 text-amber-700 dark:text-amber-200"
};

const insightIcon = {
  critical: AlertTriangle,
  neutral: Info,
  positive: CheckCircle2,
  warning: AlertTriangle
};

const emptySummary = "Not enough data to calculate your financial health yet.";
const emptyHelper = "Add income, expenses, budgets, or recurring transactions to start seeing your score and insights.";

const unavailableComponents: FinancialHealthComponent[] = [
  unavailableComponent("cashflow_health", "Cashflow Health", 30, "Add income or expense transactions to calculate cashflow health."),
  unavailableComponent("savings_rate", "Savings Rate", 25, "Add income transactions to calculate your savings rate."),
  unavailableComponent("budget_discipline", "Budget Discipline", 20, "Create budgets to track budget discipline."),
  unavailableComponent("recurring_burden", "Recurring Burden", 15, "Add recurring transactions and income to calculate recurring burden."),
  unavailableComponent("spending_stability", "Spending Stability", 10, "Add transactions across multiple periods to compare spending stability.")
];

export function FinancialHealthCard({
  errorMessage,
  financialHealth,
  isLoading,
  onRetry
}: FinancialHealthCardProps) {
  if (isLoading) {
    return <FinancialHealthSkeleton />;
  }

  if (errorMessage) {
    return (
      <SectionCard title="Financial Health Score" description="Deterministic score and insights from your financial data.">
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-5">
          <p className="text-sm font-medium text-foreground">Unable to load financial health right now.</p>
          <p className="mt-1 text-sm text-muted-foreground">{errorMessage}</p>
          <Button className="mt-4" onClick={onRetry} type="button" variant="outline">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      </SectionCard>
    );
  }

  const hasEnoughData = financialHealth?.metadata.hasEnoughData ?? false;
  const components = financialHealth?.components.length ? financialHealth.components : unavailableComponents;
  const topInsights = financialHealth?.insights.slice(0, 3) ?? [];
  const summary = hasEnoughData ? financialHealth?.summary : (financialHealth?.summary ?? emptySummary);

  return (
    <SectionCard
      title="Financial Health Score"
      description="Deterministic score and insights from your selected period."
      action={
        hasEnoughData && financialHealth ? (
          <Badge className={statusBadgeClass[financialHealth.status]}>{statusLabels[financialHealth.status]}</Badge>
        ) : (
          <Badge className="bg-muted text-muted-foreground">Not enough data</Badge>
        )
      }
      contentClassName="space-y-4 sm:space-y-6"
    >
      <div className="grid gap-4 sm:gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="rounded-lg border border-border bg-muted/30 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-secondary p-3 text-primary">
              {hasEnoughData ? <ShieldCheck className="h-5 w-5" /> : <Activity className="h-5 w-5" />}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{hasEnoughData ? "Score" : "Score not ready"}</p>
              <p className="number-tabular text-3xl font-bold text-foreground sm:text-4xl">
                {hasEnoughData && financialHealth ? financialHealth.score : "--"}
                <span className="ml-1 text-base font-semibold text-muted-foreground">/100</span>
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            <SensitiveText text={summary} />
          </p>
          {hasEnoughData && financialHealth ? (
            <div className="mt-5">
              <ProgressIndicator value={financialHealth.score} tone={progressTone[financialHealth.status]} />
            </div>
          ) : (
            <p className="mt-5 rounded-lg border border-dashed border-border bg-card/70 px-3 py-2 text-xs leading-5 text-muted-foreground">
              {emptyHelper}
            </p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {components.map((component) => (
            <ComponentItem component={component} key={component.key} />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-foreground">Top insights</p>
          <span className="text-xs text-muted-foreground">Rule-based</span>
        </div>
        {topInsights.length > 0 ? (
          <div className="grid gap-3 lg:grid-cols-3">
            {topInsights.map((insight) => (
              <InsightItem insight={insight} key={insight.id} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-5">
            <p className="text-sm font-medium text-foreground">No insights yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Once you add financial activity, BudgetFlow will show useful deterministic insights here.
            </p>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function ComponentItem({ component }: { component: FinancialHealthComponent }) {
  return (
    <div className={cn("rounded-lg border border-border p-3 sm:p-4", component.available ? "bg-card" : "bg-muted/20")}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-foreground">{component.label}</p>
        {component.available ? (
          <span className="number-tabular text-sm font-bold text-foreground">{component.score}/100</span>
        ) : (
          <Badge className="bg-muted text-muted-foreground">Pending</Badge>
        )}
      </div>
      <div className="mt-3">
        {component.available ? (
          <ProgressIndicator value={component.score ?? 0} tone={getComponentTone(component.score ?? 0)} />
        ) : (
          <div className="h-2 rounded-full bg-muted" />
        )}
      </div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        <SensitiveText text={component.explanation} />
      </p>
    </div>
  );
}

function FinancialHealthSkeleton() {
  return (
    <SectionCard title="Financial Health Score" description="Loading deterministic score and insights.">
      <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="h-44 animate-pulse rounded-lg bg-muted" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div className="h-32 animate-pulse rounded-lg bg-muted" key={index} />
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function InsightItem({ insight }: { insight: FinancialHealthInsight }) {
  const Icon = insightIcon[insight.type];

  return (
    <div className="rounded-lg border border-border bg-card p-3 sm:p-4">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
            insight.type === "positive" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200",
            insight.type === "warning" && "bg-amber-500/15 text-amber-700 dark:text-amber-200",
            insight.type === "critical" && "bg-red-500/15 text-red-700 dark:text-red-200",
            insight.type === "neutral" && "bg-muted text-muted-foreground"
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{insight.title}</p>
            <Badge className={insightBadgeClass[insight.type]}>{insight.severity}</Badge>
          </div>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            <SensitiveText text={insight.description} />
          </p>
          {insight.action ? <p className="mt-2 text-xs leading-5 text-muted-foreground">{insight.action}</p> : null}
        </div>
      </div>
    </div>
  );
}

function getComponentTone(score: number): "success" | "warning" | "danger" | "primary" {
  if (score >= 75) {
    return "success";
  }

  if (score >= 50) {
    return "warning";
  }

  return "danger";
}

function unavailableComponent(
  key: FinancialHealthComponentKey,
  label: string,
  weight: number,
  explanation: string
): FinancialHealthComponent {
  return {
    available: false,
    explanation,
    key,
    label,
    score: null,
    weight
  };
}
