/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import Link from "next/link";
import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";

export const metadata = { title: "Pack 012 — Operations & QA — Watchman Finance" };

const LINKS = [
  { href: "/finance/pack-013", label: "Pack 013 — Permissions map (operations)" },
  { href: "/finance/operations/health", label: "System health checks" },
  { href: "/finance/operations/test-suites", label: "Test suites" },
  { href: "/finance/operations/test-runs", label: "Test runs" },
  { href: "/finance/operations/test-results", label: "Test results" },
  { href: "/finance/operations/releases", label: "Release versions" },
  { href: "/finance/operations/release-checklists", label: "Release checklists" },
  { href: "/finance/operations/release-tasks", label: "Release tasks" },
  { href: "/finance/operations/alerts", label: "Operational alerts" },
  { href: "/finance/operations/jobs", label: "Job run history" },
  { href: "/finance/operations/audit-reviews", label: "Audit review logs" },
  { href: "/finance/operations/backup-verification", label: "Backup verification runs" },
  { href: "/finance/operations/restore-tests", label: "Restore test runs" },
  { href: "/finance/operations/dr-exercises", label: "Disaster recovery exercises" },
  { href: "/finance/evidence", label: "Evidence documents (Pack 019)" },
  { href: "/finance/approvals", label: "Approval requests (Pack 020)" },
];

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();

  return (
    <WorkflowPageFrame
      title="Pack 012 — Hardening, QA & production readiness"
      moduleLine="Migration pack 012: test execution, releases, monitoring, jobs, audit reviews, and recovery shells."
      packNumber={12}
      workspaceName="Operations & QA"
      workspace={workspace}
    >
      {workspace && (
        <div className="wf-card space-y-4">
          <p className="text-sm text-neutral-400 leading-relaxed">
            Server actions require <code className="text-xs text-neutral-300">operations.qa.manage</code> and the{" "}
            <code className="text-xs text-neutral-300">operations</code> module entitlement.
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
