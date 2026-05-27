"use client";

import { type ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";

export function AuthGate({ children }: { children: ReactNode }) {
  const { errorMessage, isAuthenticated, isLoading, refreshUser } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !errorMessage) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [errorMessage, isAuthenticated, isLoading, pathname, router]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-soft">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Checking your session...
        </div>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-soft">
          <h1 className="text-lg font-semibold text-foreground">Could not verify your session</h1>
          <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
          <Button className="mt-5" onClick={() => void refreshUser()} type="button">
            Retry
          </Button>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return children;
}
