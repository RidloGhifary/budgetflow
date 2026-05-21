import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ProgressIndicatorProps {
  value: number;
  label?: string;
  tone?: "primary" | "success" | "warning" | "danger";
}

const toneClasses = {
  primary: "bg-primary",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500"
};

export function ProgressIndicator({ value, label, tone = "primary" }: ProgressIndicatorProps) {
  return (
    <div className="space-y-2">
      <Progress value={value} indicatorClassName={cn(toneClasses[tone])} />
      {label ? <p className="text-xs text-muted-foreground">{label}</p> : null}
    </div>
  );
}
