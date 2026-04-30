/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import Link from "next/link";
import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";

export const metadata = { title: "Pack 002 — Integration — Watchman Finance" };

const LINKS = [
  { href: "/finance/integration/accounting-oauth", label: "External accounting (OAuth)" },
  { href: "/finance/integration/staging/employees", label: "Staging — Employees (Launch)" },
  { href: "/finance/integration/staging/time", label: "Staging — Approved time (Operations)" },
  { href: "/finance/integration/staging/service-events", label: "Staging — Service events" },
  { href: "/finance/integration/org/branches", label: "Organization — Branches" },
  { href: "/finance/integration/org/departments", label: "Organization — Departments" },
  { href: "/finance/integration/org/locations", label: "Organization — Locations" },
  { href: "/finance/integration/pipeline", label: "Integration event pipeline" },
  { href: "/finance/gl/posting-bindings", label: "GL posting bindings (Pack 017)" },
  { href: "/finance/integration/delivery-log", label: "API idempotency & webhook delivery log (Pack 022)" },
];

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();

  return (
    <WorkflowPageFrame
      title="Pack 002 — Integration & organization"
      moduleLine="Pack 002 foundation: staging tables, integration event log, and tenant org structure (branches, departments, locations)."
      packNumber={2}
      workspaceName="Integration & staging"
      workspace={workspace}
    >
      {workspace && (
        <div className="wf-card space-y-4">
          <p className="text-sm text-neutral-400 leading-relaxed">
            Use the links below to manage integration staging and tenant org data. API ingress continues to use{" "}
            <code className="text-xs text-neutral-300">/api/integrations/*</code> with the integration secret; these
            pages are for authenticated operators with the right permissions.
          </p>
          <p className="text-xs text-neutral-500">
            Start here: confirm{" "}
            <Link href="/finance/integration/org/branches" className="text-amber-500 hover:text-amber-400">
              branch/org setup
            </Link>{" "}
            first, then review staging rows, and finally monitor pipeline diagnostics.
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
