"use client";

import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export function OfflineRetryButton() {
  return (
    <Button className="mt-5" onClick={() => window.location.reload()} type="button">
      <RefreshCw className="h-4 w-4" />
      Try again
    </Button>
  );
}
