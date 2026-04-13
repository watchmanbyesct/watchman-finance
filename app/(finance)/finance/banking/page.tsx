/**
 * Copyright 2026 ESCT Holdings Inc.
 * Developed by Owens F. Shepard for ESCT Holdings Inc.
 */

import Link from "next/link";
import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";

export const metadata = { title: "Pack 006 — Banking — Watchman Finance" };

const LINKS = [
  { href: "/finance/banking/accounts", label: "Bank accounts" },
  { href: "/finance/banking/transactions", label: "Bank transactions (import & match)" },
  { href: "/finance/banking/reconciliations", label: "Reconciliations (create, approve, close)" },
  { href: "/finance/banking/transfers", label: "Transfer requests (create & approve)" },
];

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();

  return (
    <WorkflowPageFrame
      title="Pack 006 — Banking & reconciliation"
      moduleLine="Migration pack 006: bank accounts, transactions, receipt matching, reconciliation sessions, and internal transfer requests."
      packNumber={6}
      workspaceName="Banking"
      workspace={workspace}
    >
      {workspace && (
        <div className="wf-card space-y-4">
          <p className="text-sm text-neutral-400 leading-relaxed">
            Link operating accounts, import activity, match lines to open reconciliations, move reconciliations
            through approve and close, and route internal transfers with an approval step.
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
