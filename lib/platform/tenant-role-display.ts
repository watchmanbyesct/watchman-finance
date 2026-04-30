/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

const ROLE_DISPLAY: Record<string, string> = {
  platform_owner: "Platform Owner",
  tenant_admin: "Tenant Admin",
  tenant_owner: "Tenant Admin",
  finance_admin: "Finance Admin",
  hr_admin: "HR Admin",
  supervisor: "Supervisor",
};

export function displayRoleCodes(codes: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const c of codes) {
    const label = ROLE_DISPLAY[c] ?? c.replace(/_/g, " ");
    if (!seen.has(label)) {
      seen.add(label);
      out.push(label);
    }
  }
  return out.sort((a, b) => a.localeCompare(b));
}
