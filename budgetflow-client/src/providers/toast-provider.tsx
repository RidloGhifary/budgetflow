"use client";

import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info";

interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
}

interface Toast extends Required<Pick<ToastInput, "title" | "variant">> {
  id: string;
  description?: string;
}

interface ToastContextValue {
  showToast: (toast: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toastStyles: Record<ToastVariant, string> = {
  success: "border-emerald-200 bg-white text-emerald-950",
  error: "border-red-200 bg-white text-red-950",
  info: "border-border bg-white text-foreground"
};

const toastIconStyles: Record<ToastVariant, string> = {
  success: "text-emerald-600",
  error: "text-red-600",
  info: "text-primary"
};

function ToastIcon({ variant }: { variant: ToastVariant }) {
  const Icon = variant === "success" ? CheckCircle2 : variant === "error" ? XCircle : Info;

  return <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", toastIconStyles[variant])} />;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ title, description, variant = "info" }: ToastInput) => {
      const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`;
      const toast: Toast = { id, title, description, variant };

      setToasts((current) => [toast, ...current].slice(0, 4));
      window.setTimeout(() => removeToast(id), 4200);
    },
    [removeToast]
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn("flex items-start gap-3 rounded-lg border p-4 shadow-soft", toastStyles[toast.variant])}
            role="status"
          >
            <ToastIcon variant={toast.variant} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{toast.title}</p>
              {toast.description ? <p className="mt-1 text-sm text-muted-foreground">{toast.description}</p> : null}
            </div>
            <Button
              aria-label="Dismiss notification"
              className="-mr-2 -mt-2 h-8 w-8"
              onClick={() => removeToast(toast.id)}
              size="icon"
              type="button"
              variant="ghost"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider.");
  }

  return context;
}
