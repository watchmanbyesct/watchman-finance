/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import type { FiscalPeriod } from "@/types";
import type { FinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { FiscalPeriodRowActions } from "@/components/finance/gl/fiscal-period-row-actions";

export function FiscalPeriodsTable({
  periods,
  workspace,
}: {
  periods: FiscalPeriod[];
  workspace: FinanceWorkspace;
}) {
  if (!periods.length) {
    return (
      <p className="text-sm text-neutral-500 py-8 text-center border border-dashed border-white/10 rounded-lg">
        No fiscal periods yet. Create the first period for this entity above.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <table className="w-full text-sm text-left">
        <thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-neutral-500">
          <tr>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Range</th>
            <th className="px-4 py-3 font-medium">Year</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium w-40" />
          </tr>
        </thead>
        <tbody className="divide-y divide-white/8">
          {periods.map((p) => (
            <tr key={p.id} className="text-neutral-300 hover:bg-white/[0.02]">
              <td className="px-4 py-2.5">{p.periodName}</td>
              <td className="px-4 py-2.5 text-neutral-500 text-xs">
                {p.startDate} → {p.endDate}
              </td>
              <td className="px-4 py-2.5 text-neutral-500">{p.fiscalYear}</td>
              <td className="px-4 py-2.5 capitalize">
                <span
                  className={
                    p.status === "open"
                      ? "text-emerald-500/90"
                      : p.status === "closed"
                        ? "text-amber-500/80"
                        : "text-neutral-500"
                  }
                >
                  {p.status}
                </span>
              </td>
              <td className="px-4 py-2.5">
                <FiscalPeriodRowActions workspace={workspace} period={p} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
