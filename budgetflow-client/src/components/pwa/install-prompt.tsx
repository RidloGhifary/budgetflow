"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Share, X } from "lucide-react";

import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const dismissedAtKey = "budgetflow-install-dismissed-at";
const installedKey = "budgetflow-install-installed";
const dismissCooldownMs = 7 * 24 * 60 * 60 * 1000;

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIosFallback, setIsIosFallback] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    setIsDismissed(hasRecentDismissal() || isStandalone() || localStorage.getItem(installedKey) === "true");

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();

      if (hasRecentDismissal() || isStandalone() || localStorage.getItem(installedKey) === "true") {
        return;
      }

      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setIsInstallable(true);
      setIsIosFallback(false);
      setIsDismissed(false);
    };

    const handleAppInstalled = () => {
      localStorage.setItem(installedKey, "true");
      setDeferredPrompt(null);
      setIsInstallable(false);
      setIsIosFallback(false);
      setIsDismissed(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    if (!hasRecentDismissal() && !isStandalone() && isIosSafari()) {
      setIsIosFallback(true);
      setIsDismissed(false);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const copy = useMemo(
    () =>
      isIosFallback
        ? {
            icon: Share,
            title: "Install BudgetFlow",
            message: "Open the Share menu and choose Add to Home Screen for faster mobile access.",
            primaryLabel: "Got it"
          }
        : {
            icon: Download,
            title: "Install BudgetFlow",
            message: "Add BudgetFlow to your home screen for faster access and a better mobile experience.",
            primaryLabel: "Install"
          },
    [isIosFallback]
  );

  if (isDismissed || (!isInstallable && !isIosFallback)) {
    return null;
  }

  const Icon = copy.icon;

  const dismiss = () => {
    localStorage.setItem(dismissedAtKey, String(Date.now()));
    setIsDismissed(true);
  };

  const install = async () => {
    if (!deferredPrompt) {
      dismiss();
      return;
    }

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    if (choice.outcome === "accepted") {
      localStorage.setItem(installedKey, "true");
    } else {
      localStorage.setItem(dismissedAtKey, String(Date.now()));
    }

    setDeferredPrompt(null);
    setIsInstallable(false);
    setIsDismissed(true);
  };

  return (
    <aside className="fixed left-4 right-4 top-20 z-[60] rounded-xl border border-border bg-card p-4 text-card-foreground shadow-2xl md:left-auto md:right-6 md:w-[380px]">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-foreground">{copy.title}</p>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">{copy.message}</p>
            </div>
            <Button aria-label="Dismiss install prompt" onClick={dismiss} size="icon" type="button" variant="ghost">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => void install()} size="sm" type="button">
              {copy.primaryLabel}
            </Button>
            <Button onClick={dismiss} size="sm" type="button" variant="outline">
              Not now
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function hasRecentDismissal() {
  const dismissedAt = Number(localStorage.getItem(dismissedAtKey));

  return Number.isFinite(dismissedAt) && Date.now() - dismissedAt < dismissCooldownMs;
}

function isStandalone() {
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };

  return window.matchMedia("(display-mode: standalone)").matches || Boolean(navigatorWithStandalone.standalone);
}

function isIosSafari() {
  const userAgent = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(userAgent) || (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(userAgent) && !/CriOS|FxiOS|EdgiOS/.test(userAgent);

  return isIos && isSafari;
}
