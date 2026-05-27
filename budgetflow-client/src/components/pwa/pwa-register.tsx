"use client";

import { useEffect } from "react";

export function PWARegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) {
      return;
    }

    const registerServiceWorker = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js");
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.warn("BudgetFlow service worker registration failed.", error);
        }
      }
    };

    void registerServiceWorker();
  }, []);

  return null;
}
