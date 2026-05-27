import { ProgressIndicator } from "@/components/shared/progress-indicator";
import { Card } from "@/components/ui/card";
import type { SecondaryMetric } from "@/types/finance";

interface SecondaryMetricCardProps {
  badgeLabel?: string;
  metric: SecondaryMetric;
}

const toneMap = {
  primary: "primary",
  success: "success",
  warning: "warning",
  danger: "danger",
  muted: "primary"
} as const;

export function SecondaryMetricCard({ badgeLabel = "Month", metric }: SecondaryMetricCardProps) {
  return (
    <Card className="p-3 transition-colors hover:border-primary/25 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{metric.label}</p>
          <p className="mt-1 text-lg font-bold text-foreground sm:text-xl">{metric.value}</p>
        </div>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-primary">{badgeLabel}</span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground sm:mt-3">{metric.helper}</p>
      {typeof metric.progress === "number" ? (
        <div className="mt-3 sm:mt-4">
          <ProgressIndicator value={metric.progress} tone={toneMap[metric.tone]} />
        </div>
      ) : null}
    </Card>
  );
}
