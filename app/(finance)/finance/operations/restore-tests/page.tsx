/**
 * Copyright 2026 ESCT Holdings Inc.
 * Developed by Owens F. Shepard for ESCT Holdings Inc.
 */

import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { RestoreTestRunForm } from "@/components/finance/connected/reporting-planning-consolidation-ops-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listRestoreTestRunsForTenant } from "@/lib/finance/read-queries";

export const metadata = { title: "Restore tests — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      rows = (await listRestoreTestRunsForTenant(workspace.tenantId)) as Record<string, unknown>[];
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load restore test runs.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Restore test runs"
      moduleLine="Module: Operations & QA — Pack 012"
      packNumber={12}
      workspaceName="Operations & QA"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <RestoreTestRunForm workspace={workspace} />
          <div className="mt-6">
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Runs</h2>
            <WorkflowDataTable
              columns={[
                { key: "run_scope", label: "Scope" },
                { key: "module_key", label: "Module" },
                { key: "restore_status", label: "Status" },
                { key: "started_at", label: "Started" },
              ]}
              rows={rows}
            />
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
