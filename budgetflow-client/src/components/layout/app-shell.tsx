"use client";

import type { ReactNode } from "react";

import { AiChatWidget } from "@/components/dashboard/ai-chat-widget";
import { MobileNav, Sidebar } from "@/components/layout/sidebar";
import { TopHeader } from "@/components/layout/top-header";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F8FAF9] lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
      <Sidebar />
      <div className="min-w-0">
        <TopHeader />
        <MobileNav />
        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        <AiChatWidget />
      </div>
    </div>
  );
}
