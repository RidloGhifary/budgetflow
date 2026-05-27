"use client";

import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/providers/theme-provider";

export function ThemeToggle() {
  const { isMounted, theme, toggleTheme } = useTheme();
  const isDark = isMounted ? theme === "dark" : true;
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";
  const Icon = isDark ? Sun : Moon;

  return (
    <Button aria-label={label} onClick={toggleTheme} size="icon" title={label} type="button" variant="outline">
      <Icon className="h-4 w-4" />
      <span className="sr-only">{label}</span>
    </Button>
  );
}

