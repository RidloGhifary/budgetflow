"use client";

import { useState, type ElementType, type ReactNode } from "react";

import { formatCurrency, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePreferences } from "@/providers/preferences-provider";

export type SensitiveFormat = "currency" | "number" | "percent" | "text";

interface SensitiveValueProps {
  as?: ElementType;
  children?: ReactNode;
  className?: string;
  disableReveal?: boolean;
  format?: SensitiveFormat;
  mask?: string;
  revealOnHover?: boolean;
  value?: number | string | null;
  valueClassName?: string;
}

export const sensitiveValueMasks: Record<SensitiveFormat, string> = {
  currency: "Rp *****",
  number: "*****",
  percent: "**%",
  text: "*****"
};

export function SensitiveValue({
  as: Component = "span",
  children,
  className,
  disableReveal = false,
  format = "text",
  mask,
  revealOnHover = true,
  valueClassName,
  value
}: SensitiveValueProps) {
  const { privacyModeEnabled } = usePreferences();
  const [isRevealed, setIsRevealed] = useState(false);
  const isHidden = privacyModeEnabled;
  const actualValue = children ?? formatSensitiveValue(value, format);
  const maskedValue = mask ?? sensitiveValueMasks[format];
  const canReveal = isHidden && revealOnHover && !disableReveal;
  const handleRevealStart = canReveal ? () => setIsRevealed(true) : undefined;
  const handleRevealEnd = canReveal ? () => setIsRevealed(false) : undefined;
  const displayValue = canReveal && isRevealed ? actualValue : isHidden ? maskedValue : actualValue;
  const reservedWidth = getReservedValueWidth(maskedValue, actualValue);

  return (
    <Component
      aria-label={isHidden ? "Hidden sensitive value. Hover or focus to reveal." : undefined}
      className={cn(
        "inline-grid min-w-[7ch]",
        isHidden && "text-muted-foreground",
        canReveal && "cursor-help",
        className
      )}
      onBlur={handleRevealEnd}
      onFocus={handleRevealStart}
      onMouseEnter={handleRevealStart}
      onMouseLeave={handleRevealEnd}
      style={{ minWidth: reservedWidth }}
      tabIndex={canReveal ? 0 : undefined}
    >
      <span className={cn("whitespace-nowrap", valueClassName)}>{displayValue}</span>
    </Component>
  );
}

export function SensitiveText({ as: Component = "span", className, text }: { as?: ElementType; className?: string; text: string }) {
  const { privacyModeEnabled } = usePreferences();

  return <Component className={className}>{privacyModeEnabled ? maskSensitiveText(text) : text}</Component>;
}

export function maskSensitiveText(text: string) {
  return text
    .replace(/[+-]?Rp\s?[\d.]+(?:,\d+)?/gi, (match) => {
      const sign = match.trim().startsWith("-") ? "-" : match.trim().startsWith("+") ? "+" : "";
      return `${sign}Rp *****`;
    })
    .replace(/\b\d+(?:[.,]\d+)?%/g, "**%")
    .replace(/\b\d{1,3}(?:[.,]\d{3})+(?:,\d+)?\b/g, "*****")
    .replace(/\b\d{5,}(?:[.,]\d+)?\b/g, "*****");
}

export function formatPrivacySafeValue(
  value: SensitiveValueProps["value"],
  format: SensitiveFormat,
  privacyModeEnabled: boolean,
  mask?: string
) {
  if (privacyModeEnabled) {
    return mask ?? sensitiveValueMasks[format];
  }

  return formatSensitiveValue(value, format);
}

export function formatSensitiveValue(value: SensitiveValueProps["value"], format: SensitiveFormat) {
  if (value === null || value === undefined) {
    return "";
  }

  if (format === "currency") {
    return formatCurrency(Number(value));
  }

  if (format === "percent") {
    return formatPercent(Number(value));
  }

  if (format === "number") {
    return new Intl.NumberFormat("id-ID").format(Number(value));
  }

  return String(value);
}

function getReservedValueWidth(maskedValue: ReactNode, actualValue: ReactNode) {
  const maskedLength = getTextLength(maskedValue);
  const actualLength = getTextLength(actualValue);
  const maxLength = Math.max(maskedLength, actualLength, 7);

  return `${maxLength + 1}ch`;
}

function getTextLength(value: ReactNode) {
  if (typeof value === "string" || typeof value === "number") {
    return String(value).length;
  }

  return 7;
}
