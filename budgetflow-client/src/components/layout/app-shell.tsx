"use client";

import { useEffect, useState, type ReactNode } from "react";

import { AiChatWidget } from "@/components/dashboard/ai-chat-widget";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { QuickAddTransaction } from "@/components/layout/quick-add-transaction";
import { Sidebar } from "@/components/layout/sidebar";
import { TopHeader } from "@/components/layout/top-header";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { cn } from "@/lib/utils";

const sidebarCollapsedKey = "budgetflow-sidebar-collapsed";

export function AppShell({ children }: { children: ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    setIsSidebarCollapsed(localStorage.getItem(sidebarCollapsedKey) === "true");
  }, []);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((current) => {
      const nextValue = !current;
      localStorage.setItem(sidebarCollapsedKey, String(nextValue));
      return nextValue;
    });
  };

  return (
    <div
      className={cn(
        "min-h-screen bg-background transition-[grid-template-columns] duration-200 lg:grid",
        isSidebarCollapsed ? "lg:grid-cols-[88px_minmax(0,1fr)]" : "lg:grid-cols-[300px_minmax(0,1fr)]"
      )}
    >
      <Sidebar collapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
      <div className="min-w-0">
        <TopHeader />
        <main className="mx-auto w-full max-w-[1440px] px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pb-8">
          {children}
        </main>
        <InstallPrompt />
        <QuickAddTransaction />
        <MobileBottomNav />
        <AiChatWidget />
      </div>
    </div>
  );
}
