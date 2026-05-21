import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FinancialSummary } from "@/types/finance";

interface SummaryCardProps {
  summary: FinancialSummary;
  icon: LucideIcon;
}

export function SummaryCard({ summary, icon: Icon }: SummaryCardProps) {
  const isDown = summary.trend === "down";
  const isFlat = summary.trend === "flat";
  const TrendIcon = isDown ? ArrowDownRight : isFlat ? Minus : ArrowUpRight;

  return (
    <Card
      className={cn(
        "relative overflow-hidden p-5 transition-transform hover:-translate-y-0.5",
        summary.featured && "border-primary bg-primary text-primary-foreground"
      )}
    >
      {summary.featured ? <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-white/10" /> : null}
      <div className="relative flex items-start justify-between gap-4">
        <div className="space-y-3">
          <p className={cn("text-sm font-medium", summary.featured ? "text-white/80" : "text-muted-foreground")}>
            {summary.label}
          </p>
          <p className="number-tabular text-2xl font-bold sm:text-[28px]">{formatCurrency(summary.amount)}</p>
        </div>
        <div
          className={cn(
            "rounded-lg p-2.5",
            summary.featured ? "bg-white/15 text-white" : "bg-secondary text-primary"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="relative mt-5 flex items-center justify-between gap-3">
        <div
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold",
            summary.featured
              ? "bg-white/15 text-white"
              : isFlat
                ? "bg-muted text-muted-foreground"
                : isDown
                ? "bg-emerald-50 text-emerald-700"
                : "bg-secondary text-primary"
          )}
        >
          <TrendIcon className="h-3.5 w-3.5" />
          {summary.comparison}
        </div>
        <p className={cn("min-w-0 truncate text-xs", summary.featured ? "text-white/75" : "text-muted-foreground")}>
          {summary.helper}
        </p>
      </div>
    </Card>
  );
}
