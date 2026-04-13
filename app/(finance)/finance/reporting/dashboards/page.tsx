/**
 * Copyright 2026 ESCT Holdings Inc.
 * Developed by Owens F. Shepard for ESCT Holdings Inc.
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
