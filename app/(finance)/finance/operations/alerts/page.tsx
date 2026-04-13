/**
 * Copyright 2026 ESCT Holdings Inc.
 * Developed by Owens F. Shepard for ESCT Holdings Inc.
 */

import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { OperationalAlertForm } from "@/components/finance/connected/reporting-planning-consolidation-ops-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listEntitiesForTenant, listOperationalAlertsForTenant } from "@/lib/finance/read-queries";

export const metadata = { title: "Operational alerts — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let entities: { id: string; code: string; display_name: string }[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      rows = (await listOperationalAlertsForTenant(workspace.tenantId)) as Record<string, unknown>[];
      entities = (await listEntitiesForTenant(workspace.tenantId)) as typeof entities;
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load alerts.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Operational alerts"
      moduleLine="Module: Operations & QA — Pack 012"
      packNumber={12}
      workspaceName="Operations & QA"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <OperationalAlertForm workspace={workspace} entities={entities} />
          <div className="mt-6">
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Recent alerts</h2>
            <WorkflowDataTable
              columns={[
                { key: "alert_code", label: "Code" },
                { key: "module_key", label: "Module" },
                { key: "alert_severity", label: "Severity" },
                { key: "alert_status", label: "Status" },
                { key: "detected_at", label: "Detected" },
              ]}
              rows={rows}
            />
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
