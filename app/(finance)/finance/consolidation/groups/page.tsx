/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import {
  AddEntityToConsolidationGroupForm,
  ConsolidationGroupForm,
} from "@/components/finance/connected/reporting-planning-consolidation-ops-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listConsolidationGroupsForTenant } from "@/lib/finance/read-queries";

export const metadata = { title: "Consolidation groups — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let groupOptions: { id: string; group_code: string; group_name: string }[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      const g = await listConsolidationGroupsForTenant(workspace.tenantId);
      rows = g as Record<string, unknown>[];
      groupOptions = g as typeof groupOptions;
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load consolidation groups.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Consolidation groups"
      moduleLine="Module: Consolidation — Pack 011"
      packNumber={11}
      workspaceName="Consolidation"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <ConsolidationGroupForm workspace={workspace} />
          <AddEntityToConsolidationGroupForm workspace={workspace} groups={groupOptions} />
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Groups</h2>
            <WorkflowDataTable
              columns={[
                { key: "group_code", label: "Code" },
                { key: "group_name", label: "Name" },
                { key: "consolidation_currency", label: "CCY" },
                { key: "status", label: "Status" },
              ]}
              rows={rows}
            />
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
