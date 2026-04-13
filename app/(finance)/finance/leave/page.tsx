/**
 * Copyright 2026 ESCT Holdings Inc.
 * Developed by Owens F. Shepard for ESCT Holdings Inc.
 */

import Link from "next/link";
import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";

export const metadata = { title: "Pack 005 — Leave & accruals — Watchman Finance" };

const LINKS = [
  { href: "/finance/leave/types", label: "Leave types" },
  { href: "/finance/leave/policies", label: "Leave policies & assignments" },
  { href: "/finance/leave/requests", label: "Leave requests (submit & approve)" },
  { href: "/finance/leave/balances", label: "Balance ledger & accrual run" },
];

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();

  return (
    <WorkflowPageFrame
      title="Pack 005 — Leave & accruals"
      moduleLine="Migration pack 005: types, policies, assignments, requests, approvals, profiles, balance ledger, and accrual heuristics."
      packNumber={5}
      workspaceName="Leave & Accruals"
      workspace={workspace}
    >
      {workspace && (
        <div className="wf-card space-y-4">
          <p className="text-sm text-neutral-400 leading-relaxed">
            Configure types and policies, assign policies to finance people, submit and approve requests, then run
            accruals and review the balance ledger.
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
