/**
 * Copyright 2026 ESCT Holdings Inc.
 * Developed by Owens F. Shepard for ESCT Holdings Inc.
 */

import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { ReleaseTaskForm } from "@/components/finance/connected/reporting-planning-consolidation-ops-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listReleaseChecklistsForTenant, listReleaseTasksForTenant } from "@/lib/finance/read-queries";

export const metadata = { title: "Release tasks — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let checklists: { id: string; checklist_name: string; checklist_status: string }[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      rows = (await listReleaseTasksForTenant(workspace.tenantId)) as Record<string, unknown>[];
      checklists = (await listReleaseChecklistsForTenant(workspace.tenantId)) as typeof checklists;
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load release tasks.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Release tasks"
      moduleLine="Module: Operations & QA — Pack 012"
      packNumber={12}
      workspaceName="Operations & QA"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <ReleaseTaskForm workspace={workspace} checklists={checklists} />
          <div className="mt-6">
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Tasks</h2>
            <WorkflowDataTable
              columns={[
                { key: "task_code", label: "Code" },
                { key: "task_name", label: "Name" },
                { key: "task_status", label: "Status" },
                { key: "release_checklist_id", label: "Checklist" },
              ]}
              rows={rows}
            />
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
