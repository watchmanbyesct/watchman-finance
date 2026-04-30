/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import Link from "next/link";
import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";

export const metadata = { title: "Pack 009 — Reporting — Watchman Finance" };

const LINKS = [
  { href: "/finance/pack-013", label: "Pack 013 — Permissions map (reporting)" },
  { href: "/finance/reporting/reports", label: "Report definitions" },
  { href: "/finance/reporting/dashboards", label: "Dashboard definitions" },
  { href: "/finance/reporting/kpis", label: "KPI definitions" },
  { href: "/finance/reporting/close", label: "Period close checklists" },
  { href: "/finance/reporting/trial-balance-snapshots", label: "Trial balance snapshots (Pack 021)" },
];

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();

  return (
    <WorkflowPageFrame
      title="Pack 009 — Reporting & period close"
      moduleLine="Migration pack 009: report, dashboard, and KPI definitions plus close checklist shells (snapshots and task automation deferred)."
      packNumber={9}
      workspaceName="Reporting"
      workspace={workspace}
    >
      {workspace && (
        <div className="wf-card space-y-4">
          <div className="inline-flex items-center rounded-full border border-amber-700/40 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
            Workflow Shell: snapshot/task automation deferred
          </div>
          <p className="text-sm text-neutral-400 leading-relaxed">
            Register definitions with permissions on <code className="text-xs text-neutral-300">reporting.definition.manage</code>
            , then use period close to track entity-scoped checklist drafts.
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
