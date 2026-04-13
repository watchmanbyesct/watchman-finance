/**
 * Copyright 2026 ESCT Holdings Inc.
 * Developed by Owens F. Shepard for ESCT Holdings Inc.
 */

import Link from "next/link";
import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";

export const metadata = { title: "Pack 015 — Extensions — Watchman Finance" };

const WORKFLOWS: { href: string; label: string; detail: string }[] = [
  {
    href: "/finance/tax/jurisdictions",
    label: "Tax jurisdictions",
    detail: "List + form → createTaxJurisdiction (tax.profile.manage, tax module)",
  },
  {
    href: "/finance/tax/employer-profiles",
    label: "Employer tax profiles",
    detail: "List + form → createTaxEmployerProfile (tax.profile.manage)",
  },
  {
    href: "/finance/tax/liabilities",
    label: "Tax liabilities",
    detail: "List + form → createTaxLiability (tax.liability.record)",
  },
  {
    href: "/finance/tax/filing-periods",
    label: "Tax filing periods",
    detail: "List + form → createTaxFilingPeriod (tax.liability.record)",
  },
  {
    href: "/finance/tax/compliance-tasks",
    label: "Tax compliance tasks",
    detail: "List + form → createTaxComplianceTask (tax.liability.record)",
  },
  {
    href: "/finance/tax/direct-deposit",
    label: "Direct deposit batches",
    detail: "Batches + lines + forms → createDirectDepositBatch / createDirectDepositBatchItem (tax.liability.record)",
  },
  {
    href: "/finance/ar/statements",
    label: "AR statement runs",
    detail: "List + form → createArStatementRun (ar.collection.manage)",
  },
  {
    href: "/finance/ar/collections",
    label: "AR collection tasks",
    detail: "List + form → createArCollectionTask (ar.collection.manage)",
  },
  {
    href: "/finance/ap/recurring",
    label: "AP recurring vendor charges",
    detail: "List + form → createApRecurringVendorCharge (ap.recurring.manage)",
  },
];

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();

  return (
    <WorkflowPageFrame
      title="Pack 015 — Extension permissions & connected workflows"
      moduleLine="Pack 015 (SQL) seeds permissions tax.profile.manage, tax.liability.record, ar.collection.manage, ap.recurring.manage; role grants; tax module entitlement. Each link below loads read queries, tables, and server actions."
      packNumber={15}
      workspaceName="Pack 015 extensions"
      workspace={workspace}
      workflowConnected
    >
      {workspace && (
        <div className="wf-card space-y-5">
          <p className="text-sm text-neutral-400 leading-relaxed">
            Pack <span className="text-neutral-200">014</span> adds the tables; Pack{" "}
            <span className="text-neutral-200">015</span> makes mutations authorized for finance admins and tenant
            owners. Customer and vendor pickers on AR/AP routes are scoped to this entity (or tenant-wide where{" "}
            <code className="text-xs text-neutral-500">entity_id</code> is null).
          </p>
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Tax module hub</h2>
            <Link href="/finance/tax" className="text-sm text-amber-500 hover:text-amber-400">
              Pack 014 tax overview →
            </Link>
          </div>
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Connected workflows</h2>
            <ul className="space-y-3 text-sm">
              {WORKFLOWS.map((w) => (
                <li key={w.href} className="border border-white/8 rounded-md px-3 py-2.5">
                  <Link href={w.href} className="text-amber-500 hover:text-amber-400 font-medium">
                    {w.label}
                  </Link>
                  <p className="text-xs text-neutral-500 mt-1 leading-relaxed">{w.detail}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </WorkflowPageFrame>
  );
}
