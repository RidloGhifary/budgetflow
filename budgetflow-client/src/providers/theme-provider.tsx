"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { themeStorageKey, type ThemeMode } from "@/lib/theme";

interface ThemeContextValue {
  isMounted: boolean;
  setTheme: (theme: ThemeMode) => void;
  theme: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("dark");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const currentTheme = getStoredTheme();

    safelyApplyTheme(currentTheme);
    setThemeState(currentTheme);
    setIsMounted(true);
  }, []);

  const setTheme = useCallback((nextTheme: ThemeMode) => {
    safelyApplyTheme(nextTheme);
    try {
      window.localStorage?.setItem(themeStorageKey, nextTheme);
    } catch {
      // Theme still applies for the current session when browser storage is unavailable.
    }
    setThemeState(nextTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [setTheme, theme]);

  const value = useMemo(
    () => ({
      isMounted,
      setTheme,
      theme,
      toggleTheme
    }),
    [isMounted, setTheme, theme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}

function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "dark";
  }

  let storedTheme: string | null = null;

  try {
    storedTheme = window.localStorage?.getItem(themeStorageKey) ?? null;
  } catch {
    storedTheme = null;
  }

  return storedTheme === "light" || storedTheme === "dark" ? storedTheme : "dark";
}

function safelyApplyTheme(theme: ThemeMode) {
  try {
    applyTheme(theme);
  } catch {
    // Rendering should never fail just because the host cannot mutate document classes.
  }
}

function applyTheme(theme: ThemeMode) {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;

  root.classList.remove("light", "dark");
  root.classList.add(theme);
  root.style.colorScheme = theme;
}
