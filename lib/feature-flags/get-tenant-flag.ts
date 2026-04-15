/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import { createSupabaseServerClient } from "@/lib/db/supabase-server";

/**
 * Resolve a tenant-level feature flag.
 * Returns false if the flag is not configured (safe default).
 */
export async function getTenantFlag(
  tenantId: string,
  flagKey: string
): Promise<boolean> {
  try {
    const supabase = createSupabaseServerClient();
    const { data } = await supabase
      .from("feature_flags")
      .select("is_enabled")
      .eq("tenant_id", tenantId)
      .eq("flag_key", flagKey)
      .single();

    return data?.is_enabled ?? false;
  } catch {
    return false;
  }
}

/**
 * Resolve multiple feature flags for a tenant in a single query.
 * Returns a map of flag_key -> boolean.
 */
export async function getTenantFlags(
  tenantId: string,
  flagKeys: string[]
): Promise<Record<string, boolean>> {
  const result: Record<string, boolean> = {};
  for (const key of flagKeys) result[key] = false;

  try {
    const supabase = createSupabaseServerClient();
    const { data } = await supabase
      .from("feature_flags")
      .select("flag_key, is_enabled")
      .eq("tenant_id", tenantId)
      .in("flag_key", flagKeys);

    for (const row of data ?? []) {
      result[row.flag_key] = row.is_enabled ?? false;
    }
  } catch {}

  return result;
}
