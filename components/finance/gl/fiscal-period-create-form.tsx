/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import "server-only";

import { submitCreateFiscalPeriodForm } from "@/modules/finance-core/actions/finance-core-actions";
import type { FinanceWorkspace } from "@/lib/context/resolve-finance-workspace";

export function FiscalPeriodCreateForm({ workspace }: { workspace: FinanceWorkspace }) {
  return (
    <div className="wf-card">
      <h2 className="text-sm font-medium text-neutral-200 mb-4">Open new period</h2>
      <form action={submitCreateFiscalPeriodForm} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <input type="hidden" name="tenantId" value={workspace.tenantId} />
        <input type="hidden" name="entityId" value={workspace.entityId} />

        <label className="flex flex-col gap-1.5 md:col-span-2">
          <span className="text-neutral-500 text-xs">Period name</span>
          <input
            name="periodName"
            required
            maxLength={100}
            className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-neutral-200 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
            placeholder="e.g. January 2026"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-neutral-500 text-xs">Start date</span>
          <input
            name="startDate"
            type="date"
            required
            className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-neutral-200 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-neutral-500 text-xs">End date</span>
          <input
            name="endDate"
            type="date"
            required
            className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-neutral-200 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-neutral-500 text-xs">Fiscal year</span>
          <input
            name="fiscalYear"
            type="number"
            required
            min={2000}
            max={2100}
            defaultValue={new Date().getFullYear()}
            className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-neutral-200 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-neutral-500 text-xs">Fiscal month (optional)</span>
          <input
            name="fiscalMonth"
            type="number"
            min={1}
            max={12}
            className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-neutral-200 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
            placeholder="1–12"
          />
        </label>

        <div className="md:col-span-2">
          <button
            type="submit"
            className="rounded-md bg-amber-500/90 text-black text-sm font-medium px-4 py-2 hover:bg-amber-400 transition-colors"
          >
            Create period
          </button>
        </div>
      </form>
    </div>
  );
}
