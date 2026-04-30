/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { DashboardDefinitionForm } from "@/components/finance/connected/reporting-planning-consolidation-ops-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listDashboardDefinitionsForTenant } from "@/lib/finance/read-queries";

export const metadata = { title: "Dashboards — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      rows = (await listDashboardDefinitionsForTenant(workspace.tenantId)) as Record<string, unknown>[];
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load dashboards.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Dashboard definitions"
      moduleLine="Module: Reporting — Pack 009"
      packNumber={9}
      workspaceName="Reporting"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <div className="inline-flex items-center rounded-full border border-amber-700/40 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
            Workflow Shell: dashboard runtime widgets deferred
          </div>
          <DashboardDefinitionForm workspace={workspace} />
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Definitions</h2>
            <WorkflowDataTable
              columns={[
                { key: "dashboard_code", label: "Code" },
                { key: "dashboard_name", label: "Name" },
                { key: "dashboard_category", label: "Category" },
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
