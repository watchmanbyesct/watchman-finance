/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import Link from "next/link";
import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";

export const metadata = { title: "Pack 010 — Planning — Watchman Finance" };

const LINKS = [
  { href: "/finance/pack-013", label: "Pack 013 — Permissions map (planning)" },
  { href: "/finance/planning/budgets", label: "Budget versions & lines" },
  { href: "/finance/planning/forecasts", label: "Forecast versions & lines" },
  { href: "/finance/planning/variance", label: "Variance snapshots" },
];

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();

  return (
    <WorkflowPageFrame
      title="Pack 010 — Budgeting & forecasting"
      moduleLine="Migration pack 010: budget versions, forecast versions, lines, and variance snapshot shells."
      packNumber={10}
      workspaceName="Planning"
      workspace={workspace}
    >
      {workspace && (
        <div className="wf-card space-y-4">
          <div className="inline-flex items-center rounded-full border border-amber-700/40 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
            Workflow Shell: advanced variance automation deferred
          </div>
          <p className="text-sm text-neutral-400 leading-relaxed">
            Use <code className="text-xs text-neutral-300">planning.budget.manage</code> and{" "}
            <code className="text-xs text-neutral-300">planning.forecast.manage</code> to create versions, lines, and
            variance snapshot rows for this entity.
          </p>
          <p className="text-xs text-neutral-500">
            If no versions exist yet, start with{" "}
            <Link href="/finance/planning/budgets" className="text-amber-500 hover:text-amber-400">
              budgets
            </Link>{" "}
            then add{" "}
            <Link href="/finance/planning/forecasts" className="text-amber-500 hover:text-amber-400">
              forecasts
            </Link>{" "}
            before opening variance snapshots.
          </p>
          <ul className="space-y-2 text-sm">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-amber-500 hover:text-amber-400">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </WorkflowPageFrame>
  );
}
