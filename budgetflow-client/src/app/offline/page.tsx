import Image from "next/image";

import { OfflineRetryButton } from "@/components/pwa/offline-retry-button";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-soft">
        <Image
          alt="BudgetFlow"
          className="mx-auto h-14 w-14 rounded-xl border border-border bg-card object-cover shadow-sm"
          height={56}
          src="/icon.png"
          width={56}
        />
        <h1 className="mt-5 text-2xl font-bold text-foreground">You are offline</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          BudgetFlow cannot load this page right now. Check your connection and try again.
        </p>
        <OfflineRetryButton />
      </section>
    </main>
  );
}
