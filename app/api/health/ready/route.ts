/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import { NextResponse } from "next/server";
import { OBSERVABILITY_NO_STORE, getDeploymentSlice } from "@/lib/observability/deployment-metadata";
import { pingSupabaseAuthHealth } from "@/lib/observability/supabase-auth-health";

/** Readiness: env + Supabase Auth reachability. */
export async function GET() {
  const base = {
    kind: "readiness" as const,
    service: "watchman-finance",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? "1.0.0",
    appEnv: process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV ?? "development",
    deployment: getDeploymentSlice(),
  };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anon) {
    return NextResponse.json(
      {
        ...base,
        status: "degraded" as const,
        checks: { env: false, supabaseAuth: { ok: false } },
      },
      { status: 503, headers: OBSERVABILITY_NO_STORE },
    );
  }

  try {
    const supabaseAuth = await pingSupabaseAuthHealth(url, anon);
    const ok = supabaseAuth.ok;
    return NextResponse.json(
      {
        ...base,
        status: ok ? ("ok" as const) : ("degraded" as const),
        checks: {
          env: true,
          supabaseAuth: { ok: supabaseAuth.ok, httpStatus: supabaseAuth.status ?? null },
        },
      },
      { status: ok ? 200 : 503, headers: OBSERVABILITY_NO_STORE },
    );
  } catch {
    return NextResponse.json(
      {
        ...base,
        status: "degraded" as const,
        checks: {
          env: true,
          supabaseAuth: { ok: false, httpStatus: null as number | null },
        },
      },
      { status: 503, headers: OBSERVABILITY_NO_STORE },
    );
  }
}
