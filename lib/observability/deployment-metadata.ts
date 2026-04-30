/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

export type DeploymentSlice = Record<string, string>;

export function getDeploymentSlice(): DeploymentSlice | null {
  const out: DeploymentSlice = {};
  if (process.env.VERCEL_DEPLOYMENT_ID) out.deploymentId = process.env.VERCEL_DEPLOYMENT_ID;
  if (process.env.VERCEL_ENV) out.vercelEnv = process.env.VERCEL_ENV;
  if (process.env.VERCEL_GIT_COMMIT_SHA) out.gitCommitSha = process.env.VERCEL_GIT_COMMIT_SHA;
  if (process.env.VERCEL_REGION) out.region = process.env.VERCEL_REGION;
  return Object.keys(out).length ? out : null;
}

export const OBSERVABILITY_NO_STORE = {
  "Cache-Control": "no-store, max-age=0",
} as const;
