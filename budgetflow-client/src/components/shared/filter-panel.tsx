"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronRight, Filter, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FilterGroup<TDraft> {
  id: string;
  render: (draft: TDraft, setDraft: (draft: TDraft) => void) => ReactNode;
  summary?: string;
  title: string;
}

interface FilterPanelProps<TDraft> {
  activeCount: number;
  disabled?: boolean;
  draft: TDraft;
  groups: Array<FilterGroup<TDraft>>;
  onApply: (draft: TDraft) => void;
  onReset: () => TDraft;
  title?: string;
}

export function FilterPanel<TDraft>({
  activeCount,
  disabled,
  draft: appliedDraft,
  groups,
  onApply,
  onReset,
  title = "Filter"
}: FilterPanelProps<TDraft>) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [draft, setDraft] = useState(appliedDraft);
  const activeGroup = useMemo(() => groups.find((group) => group.id === activeGroupId) ?? null, [activeGroupId, groups]);

  useEffect(() => {
    if (isOpen) {
      setDraft(appliedDraft);
      setActiveGroupId(null);
    }
  }, [appliedDraft, isOpen]);

  const handleReset = () => {
    setDraft(onReset());
  };

  const handleApply = () => {
    onApply(draft);
    setIsOpen(false);
    setActiveGroupId(null);
  };

  return (
    <div className="relative">
      <Button disabled={disabled} onClick={() => setIsOpen(true)} type="button" variant="outline">
        <Filter className="h-4 w-4" />
        {activeCount > 0 ? `Filter (${activeCount})` : "Filter"}
      </Button>

      {isOpen ? (
        <div className="fixed inset-0 z-40">
          <button aria-label="Close filters" className="absolute inset-0 bg-black/20" onClick={() => setIsOpen(false)} type="button" />
          <div className="absolute bottom-0 right-0 top-auto flex max-h-[88vh] w-full flex-col rounded-t-xl border border-border bg-card shadow-2xl md:bottom-auto md:top-20 md:mr-6 md:max-h-[calc(100vh-7rem)] md:w-[420px] md:rounded-lg">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                {activeGroup ? (
                  <Button aria-label="Back to filter groups" onClick={() => setActiveGroupId(null)} size="icon" type="button" variant="ghost">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                ) : null}
                <div>
                  <p className="text-sm font-semibold text-foreground">{activeGroup ? `Filter ${activeGroup.title}` : title}</p>
                  <p className="text-xs text-muted-foreground">{activeGroup ? "Choose options, then apply." : "Select a filter group."}</p>
                </div>
              </div>
              <Button aria-label="Close filters" onClick={() => setIsOpen(false)} size="icon" type="button" variant="ghost">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {activeGroup ? (
                activeGroup.render(draft, setDraft)
              ) : (
                <div className="space-y-2">
                  {groups.map((group) => (
                    <button
                      key={group.id}
                      className="flex w-full items-center justify-between gap-3 rounded-md border border-border p-3 text-left transition-colors hover:border-primary/30 hover:bg-secondary/60"
                      onClick={() => setActiveGroupId(group.id)}
                      type="button"
                    >
                      <span>
                        <span className="block text-sm font-medium text-foreground">{group.title}</span>
                        {group.summary ? <span className="mt-1 block text-xs text-muted-foreground">{group.summary}</span> : null}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border p-4">
              <Button onClick={handleReset} type="button" variant="outline">
                Reset
              </Button>
              <Button onClick={handleApply} type="button">
                Apply
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export const filterSelectClassName =
  "flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50";

export function FilterField({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export function ActiveFilterChips({ chips, onClear }: { chips: string[]; onClear?: () => void }) {
  if (chips.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <span key={chip} className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-primary">
          {chip}
        </span>
      ))}
      {onClear ? (
        <button className={cn("text-xs font-semibold text-primary hover:underline")} onClick={onClear} type="button">
          Clear all
        </button>
      ) : null}
    </div>
  );
}
