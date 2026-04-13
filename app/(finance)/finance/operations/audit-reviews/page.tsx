/**
 * Copyright 2026 ESCT Holdings Inc.
 * Developed by Owens F. Shepard for ESCT Holdings Inc.
 */

import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { AuditReviewLogForm } from "@/components/finance/connected/reporting-planning-consolidation-ops-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listAuditReviewLogsForTenant, listEntitiesForTenant } from "@/lib/finance/read-queries";

export const metadata = { title: "Audit reviews — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let entities: { id: string; code: string; display_name: string }[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      rows = (await listAuditReviewLogsForTenant(workspace.tenantId)) as Record<string, unknown>[];
      entities = (await listEntitiesForTenant(workspace.tenantId)) as typeof entities;
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load audit review logs.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Audit review logs"
      moduleLine="Module: Operations & QA — Pack 012"
      packNumber={12}
      workspaceName="Operations & QA"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <AuditReviewLogForm workspace={workspace} entities={entities} />
          <div className="mt-6">
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Logs</h2>
            <WorkflowDataTable
              columns={[
                { key: "review_scope", label: "Scope" },
                { key: "review_status", label: "Status" },
                { key: "review_date", label: "Review date" },
                { key: "entity_id", label: "Entity" },
              ]}
              rows={rows}
            />
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
