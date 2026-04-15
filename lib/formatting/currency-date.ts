/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

/**
 * Format a number as USD currency.
 */
export function formatCurrency(
  amount: number,
  currency = "USD",
  locale = "en-US"
): string {
  return new Intl.NumberFormat(locale, {
    style:                 "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a number as a compact currency string (e.g. $1.2M).
 */
export function formatCurrencyCompact(amount: number, currency = "USD"): string {
  if (Math.abs(amount) >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(amount) >= 1_000) {
    return `$${(amount / 1_000).toFixed(1)}K`;
  }
  return formatCurrency(amount, currency);
}

/**
 * Format an ISO date string as a human-readable date.
 * Input: "2024-03-15" → Output: "Mar 15, 2024"
 */
export function formatDate(isoDate: string, locale = "en-US"): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(locale, {
    year:  "numeric",
    month: "short",
    day:   "numeric",
  });
}

/**
 * Format a date as a short string: "Mar 15"
 */
export function formatDateShort(isoDate: string, locale = "en-US"): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(locale, { month: "short", day: "numeric" });
}

/**
 * Format a numeric percentage.
 * 0.1535 → "15.4%"
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Return today's date as YYYY-MM-DD.
 */
export function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Returns true if a is before b (YYYY-MM-DD strings).
 */
export function dateBefore(a: string, b: string): boolean {
  return a < b;
}
