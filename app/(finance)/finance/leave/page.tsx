/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
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
      moduleLine="Pack 005 foundation: leave types, policies, assignments, requests, approvals, and balance ledger accruals."
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
          <p className="text-xs text-neutral-500">
            Start here: create{" "}
            <Link href="/finance/leave/types" className="text-amber-500 hover:text-amber-400">
              leave types
            </Link>{" "}
            and policies first, then process requests and balances.
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
