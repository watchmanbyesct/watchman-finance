/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import Link from "next/link";
import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { FinanceApprovalWorkflowForms } from "@/components/finance/connected/workflow-extensions-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { ModuleWorkspaceStatus } from "@/components/finance/module-workspace-status";
import { GlSetupRequired } from "@/components/finance/gl/gl-setup-required";
import { listFinanceApprovalRequestsForEntity } from "@/lib/finance/read-queries";

export const metadata = { title: "Approval requests — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();

  if (!workspace) {
    return (
      <div className="max-w-5xl space-y-6">
        <div>
          <h1 className="wf-page-title">Approval requests</h1>
          <p className="text-sm text-neutral-500 mt-1">Pack 020 — Cross-module approval shell</p>
        </div>
        <ModuleWorkspaceStatus packNumber={20} workspaceName="Finance approvals" />
        <GlSetupRequired />
      </div>
    );
  }

  let rows: Awaited<ReturnType<typeof listFinanceApprovalRequestsForEntity>> = [];
  let loadError: string | null = null;
  try {
    rows = await listFinanceApprovalRequestsForEntity(workspace.tenantId, workspace.entityId);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Failed to load approvals.";
  }

  return (
    <WorkflowPageFrame
      title="Approval requests"
      moduleLine="Pack 020 approval workflow with Pack 023 permission bridge. Draft, submit, and resolve generic approval rows for any finance subject."
      packNumber={20}
      workspaceName="Finance approvals"
      workspace={workspace}
      loadError={loadError}
    >
      <div className="inline-flex items-center rounded-full border border-amber-700/40 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
        Workflow Shell: escalation automation deferred
      </div>
      <p className="text-sm text-neutral-500">
        Copy an <code className="text-xs text-neutral-400">id</code> from the table into the submit or resolve forms.{" "}
        <Link href="/finance/evidence" className="text-amber-500 hover:text-amber-400">
          Evidence documents
        </Link>
        . Start by creating a draft request, then submit it and resolve it after review.
      </p>

      <FinanceApprovalWorkflowForms workspace={workspace} />

      <div>
        <h2 className="text-sm font-medium text-neutral-300 mb-3">Requests for this entity</h2>
        <WorkflowDataTable
          columns={[
            { key: "request_code", label: "Code" },
            { key: "request_title", label: "Title" },
            { key: "request_status", label: "Status" },
            { key: "priority", label: "Priority" },
            { key: "id", label: "Id" },
            { key: "created_at", label: "Created" },
          ]}
          rows={rows as Record<string, unknown>[]}
          emptyMessage="No approval requests yet."
        />
      </div>
    </WorkflowPageFrame>
  );
}
