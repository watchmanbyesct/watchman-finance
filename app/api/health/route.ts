/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import { NextResponse } from "next/server";
import { OBSERVABILITY_NO_STORE, getDeploymentSlice } from "@/lib/observability/deployment-metadata";

/** Liveness: no downstream dependency calls (cheap uptime pings). */
export function GET() {
  return NextResponse.json(
    {
      status: "ok" as const,
      kind: "liveness" as const,
      service: "watchman-finance",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? "1.0.0",
      appEnv: process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV ?? "development",
      deployment: getDeploymentSlice(),
    },
    { headers: OBSERVABILITY_NO_STORE },
  );
}
