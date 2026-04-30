/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

"use client";

import type { FinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { switchWatchmanTenant } from "@/modules/workspace/actions/switch-watchman-tenant";

export function FinanceWorkspaceBanner({
  workspace,
}: {
  workspace: FinanceWorkspace;
}) {
  const roles = workspace.roleSummaries.slice(0, 4).join(" · ");

  return (
    <div className="flex items-center gap-2 min-w-0 flex-shrink-0 text-xs text-neutral-400">
      {workspace.tenantOptions.length > 1 ? (
        <form action={switchWatchmanTenant} className="flex items-center gap-1.5 min-w-0">
          <label htmlFor="wm-finance-tenant" className="sr-only">
            Tenant
          </label>
          <select
            id="wm-finance-tenant"
            name="tenant_id"
            defaultValue={workspace.tenantId}
            className="max-w-[14rem] sm:max-w-xs truncate rounded border border-white/12 bg-neutral-950/80 text-neutral-200 text-xs py-1 px-2"
            aria-label="Active tenant"
            onChange={(e) => {
              e.currentTarget.form?.requestSubmit();
            }}
          >
            {workspace.tenantOptions.map((t) => (
              <option key={t.tenantId} value={t.tenantId}>
                {t.displayName}
              </option>
            ))}
          </select>
          <input type="hidden" name="redirect_to" value="/finance/dashboard" />
        </form>
      ) : (
        <span className="truncate font-medium text-neutral-300">{workspace.tenantDisplayName}</span>
      )}
      <span className="text-neutral-600 hidden lg:inline flex-shrink-0">·</span>
      <span className="hidden lg:flex flex-col gap-0.5 min-w-0">
        <span className="truncate text-neutral-500">
          {workspace.entityDisplayName}{" "}
          <span className="opacity-75">({workspace.entityCode})</span>
        </span>
        {roles.length > 0 && (
          <span className="truncate text-neutral-600" title={roles}>
            Roles: {roles}
            {workspace.roleSummaries.length > 4 ? " +" : ""}
          </span>
        )}
      </span>
      <span className="lg:hidden truncate text-neutral-500">
        {workspace.entityCode}
      </span>
    </div>
  );
}
