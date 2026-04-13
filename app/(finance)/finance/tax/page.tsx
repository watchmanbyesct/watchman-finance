/**
 * Copyright 2026 ESCT Holdings Inc.
 * Developed by Owens F. Shepard for ESCT Holdings Inc.
 */

import Link from "next/link";
import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";

export const metadata = { title: "Pack 014 — Tax & payroll pay — Watchman Finance" };

const LINKS = [
  { href: "/finance/tax/jurisdictions", label: "Tax jurisdictions (tenant-wide)" },
  { href: "/finance/tax/employer-profiles", label: "Employer tax profiles" },
  { href: "/finance/tax/liabilities", label: "Tax liabilities" },
  { href: "/finance/tax/filing-periods", label: "Filing periods" },
  { href: "/finance/tax/compliance-tasks", label: "Compliance tasks" },
  { href: "/finance/tax/direct-deposit", label: "Direct deposit batches & lines" },
];

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();

  return (
    <WorkflowPageFrame
      title="Pack 014 — Tax, AR statements, collections, AP recurring"
      moduleLine="Packs 014–015: Pack 014 defines tax/statutory tables, direct deposit batches, AR statement runs, collection tasks, and AP recurring charges. Pack 015 seeds permissions and the tax module entitlement."
      packNumber={15}
      workspaceName="Tax & extensions"
      workspace={workspace}
    >
      {workspace && (
        <div className="wf-card space-y-4">
          <p className="text-sm text-neutral-400 leading-relaxed">
            Jurisdictions are tenant-scoped; employer profiles, liabilities, filings, compliance, and ACH batches are
            entity-scoped. Enable the <code className="text-neutral-500">tax</code> module and grant{" "}
            <code className="text-neutral-500">tax.profile.manage</code> /{" "}
            <code className="text-neutral-500">tax.liability.record</code> after migration 015.
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
