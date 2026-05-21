import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface StatTileProps {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  tone?: "primary" | "success" | "warning" | "danger" | "blue";
}

const toneClasses = {
  primary: "bg-secondary text-primary",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-700",
  blue: "bg-blue-50 text-blue-700"
};

export function StatTile({ label, value, helper, icon: Icon, tone = "primary" }: StatTileProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="number-tabular text-xl font-bold text-foreground">{value}</p>
        </div>
        <div className={cn("rounded-md p-2", toneClasses[tone])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{helper}</p>
    </div>
  );
}
