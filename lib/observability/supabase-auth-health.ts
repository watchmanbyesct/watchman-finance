/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

export async function pingSupabaseAuthHealth(
  supabaseUrl: string,
  anonKey: string,
  timeoutMs = 5000,
): Promise<{ ok: boolean; status?: number }> {
  const base = supabaseUrl.replace(/\/+$/, "");
  const url = `${base}/auth/v1/health`;
  const res = await fetch(url, {
    method: "GET",
    headers: { apikey: anonKey },
    signal: AbortSignal.timeout(timeoutMs),
  });
  return { ok: res.ok, status: res.status };
}
