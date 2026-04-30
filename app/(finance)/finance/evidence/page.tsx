/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import Link from "next/link";
import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { FinanceEvidenceWorkflowForm } from "@/components/finance/connected/workflow-extensions-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { ModuleWorkspaceStatus } from "@/components/finance/module-workspace-status";
import { GlSetupRequired } from "@/components/finance/gl/gl-setup-required";
import { listFinanceEvidenceDocumentsForScope } from "@/lib/finance/read-queries";

export const metadata = { title: "Evidence documents — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();

  if (!workspace) {
    return (
      <div className="max-w-5xl space-y-6">
        <div>
          <h1 className="wf-page-title">Evidence documents</h1>
          <p className="text-sm text-neutral-500 mt-1">Pack 019 — Finance evidence metadata (Pack 023 permission bridge)</p>
        </div>
        <ModuleWorkspaceStatus packNumber={19} workspaceName="Finance evidence" />
        <GlSetupRequired />
      </div>
    );
  }

  let rows: Awaited<ReturnType<typeof listFinanceEvidenceDocumentsForScope>> = [];
  let loadError: string | null = null;
  try {
    rows = await listFinanceEvidenceDocumentsForScope(workspace.tenantId, workspace.entityId);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Failed to load evidence.";
  }

  return (
    <WorkflowPageFrame
      title="Evidence documents"
      moduleLine="Pack 019 evidence registry with Pack 023 workflow permission bridge. Register storage paths and metadata tied to finance records."
      packNumber={19}
      workspaceName="Finance evidence"
      workspace={workspace}
      loadError={loadError}
    >
      <div className="inline-flex items-center rounded-full border border-amber-700/40 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
        Workflow Shell: file storage lifecycle handled externally
      </div>
      <p className="text-sm text-neutral-500">
        Upload files to your object store first, then register the bucket and path here. Related:{" "}
        <Link href="/finance/approvals" className="text-amber-500 hover:text-amber-400">
          Approval requests
        </Link>
        . If this table is empty, create a row after uploading a document and validating the parent record id.
      </p>

      <FinanceEvidenceWorkflowForm workspace={workspace} />

      <div>
        <h2 className="text-sm font-medium text-neutral-300 mb-3">Registered documents</h2>
        <WorkflowDataTable
          columns={[
            { key: "domain", label: "Domain" },
            { key: "parent_table", label: "Parent" },
            { key: "title", label: "Title" },
            { key: "storage_object_path", label: "Object path" },
            { key: "created_at", label: "Created" },
          ]}
          rows={rows as Record<string, unknown>[]}
          emptyMessage="No evidence rows yet."
        />
      </div>
    </WorkflowPageFrame>
  );
}
