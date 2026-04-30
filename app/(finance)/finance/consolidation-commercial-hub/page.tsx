/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import Link from "next/link";
import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";

export const metadata = { title: "Pack 011 — Consolidation & commercial — Watchman Finance" };

const CONSOLIDATION = [
  { href: "/finance/pack-013", label: "Pack 013 — Permissions map (consolidation)" },
  { href: "/finance/consolidation/groups", label: "Consolidation groups & entity inclusion" },
  { href: "/finance/consolidation/relationships", label: "Entity relationships" },
  { href: "/finance/consolidation/snapshots", label: "Consolidation snapshots" },
  { href: "/finance/consolidation/intercompany-accounts", label: "Intercompany account mappings" },
  { href: "/finance/consolidation/intercompany-transactions", label: "Intercompany transactions" },
];

const COMMERCIAL = [
  { href: "/finance/commercial/provisioning-templates", label: "Provisioning templates (list + create)" },
  { href: "/finance/commercial/bootstrap", label: "Tenant bootstrap runs" },
  { href: "/finance/commercial/feature-flags", label: "Tenant feature flags" },
  { href: "/finance/commercial/activation", label: "Tenant activation checklists & tasks" },
  { href: "/finance/commercial/client-portal", label: "Client portal profiles" },
];

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();

  return (
    <WorkflowPageFrame
      title="Pack 011 — Consolidation & commercial readiness"
      moduleLine="Migration pack 011: multi-entity consolidation, intercompany, and tenant commercialization shells."
      packNumber={11}
      workspaceName="Consolidation & commercial"
      workspace={workspace}
    >
      {workspace && (
        <div className="space-y-6">
          <div className="wf-card space-y-3">
            <div className="inline-flex items-center rounded-full border border-amber-700/40 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
              Workflow Shell: consolidation lifecycle partially implemented
            </div>
            <h2 className="text-sm font-medium text-neutral-200">Consolidation</h2>
            <p className="text-xs text-neutral-500">
              Uses <code className="text-neutral-400">consolidation.group.manage</code> on server actions.
            </p>
            <p className="text-xs text-neutral-500">
              New setup flow: create{" "}
              <Link href="/finance/consolidation/groups" className="text-amber-500 hover:text-amber-400">
                groups
              </Link>{" "}
              then map{" "}
              <Link href="/finance/consolidation/relationships" className="text-amber-500 hover:text-amber-400">
                entity relationships
              </Link>{" "}
              before snapshot runs.
            </p>
            <ul className="space-y-2 text-sm">
              {CONSOLIDATION.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-amber-500 hover:text-amber-400">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="wf-card space-y-3">
            <div className="inline-flex items-center rounded-full border border-amber-700/40 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
              Workflow Shell: commercialization orchestration deferred
            </div>
            <h2 className="text-sm font-medium text-neutral-200">Commercial readiness</h2>
            <p className="text-xs text-neutral-500">
              Start from{" "}
              <Link href="/finance/commercial/provisioning-templates" className="text-amber-500 hover:text-amber-400">
                provisioning templates
              </Link>{" "}
              and{" "}
              <Link href="/finance/commercial/bootstrap" className="text-amber-500 hover:text-amber-400">
                tenant bootstrap
              </Link>{" "}
              before activation tasks and client portal profiles.
            </p>
            <ul className="space-y-2 text-sm">
              {COMMERCIAL.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-amber-500 hover:text-amber-400">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </WorkflowPageFrame>
  );
}
