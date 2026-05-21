"use client";

import { type ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";

import { getSafeNextPath } from "@/lib/navigation";
import { useAuth } from "@/providers/auth-provider";

export function PublicAuthRedirect({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(getSafeNextPath());
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return null;
  }

  if (isAuthenticated) {
    return null;
  }

  return children;
}
