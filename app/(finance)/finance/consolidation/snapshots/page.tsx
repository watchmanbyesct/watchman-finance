/**
 * Copyright 2026 ESCT Holdings Inc.
 * Developed by Owens F. Shepard for ESCT Holdings Inc.
 */

import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { ConsolidationSnapshotForm } from "@/components/finance/connected/reporting-planning-consolidation-ops-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listConsolidationGroupsForTenant, listConsolidationSnapshotsForTenant } from "@/lib/finance/read-queries";

export const metadata = { title: "Consolidation snapshots — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let groupOptions: { id: string; group_code: string; group_name: string }[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      rows = (await listConsolidationSnapshotsForTenant(workspace.tenantId)) as Record<string, unknown>[];
      groupOptions = (await listConsolidationGroupsForTenant(workspace.tenantId)) as typeof groupOptions;
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load consolidation snapshots.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Consolidation snapshots"
      moduleLine="Module: Consolidation — Pack 011"
      packNumber={11}
      workspaceName="Consolidation"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <div className="space-y-6">
          <ConsolidationSnapshotForm workspace={workspace} groups={groupOptions} />
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Snapshots</h2>
            <WorkflowDataTable
              columns={[
                { key: "consolidation_group_id", label: "Group" },
                { key: "snapshot_date", label: "Date" },
                { key: "snapshot_status", label: "Status" },
                { key: "generated_at", label: "Generated" },
              ]}
              rows={rows}
            />
          </div>
        </div>
      )}
    </WorkflowPageFrame>
  );
}
