/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

/** Shared HR/Finance chrome: active tenant persisted per browser session. */
export const WATCHMAN_ACTIVE_TENANT_COOKIE = "wm.active_tenant_id";

export function resolveActiveTenantId(args: {
  cookieValue: string | undefined | null;
  eligibleTenantIds: string[];
}): string | null {
  const ids = args.eligibleTenantIds;
  if (!ids.length) return null;
  const raw = typeof args.cookieValue === "string" ? args.cookieValue.trim() : "";
  if (raw && ids.includes(raw)) return raw;
  return ids[0] ?? null;
}
