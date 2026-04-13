/**
 * Copyright 2026 ESCT Holdings Inc.
 * Developed by Owens F. Shepard for ESCT Holdings Inc.
 */

import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { IntercompanyAccountForm } from "@/components/finance/connected/reporting-planning-consolidation-ops-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listEntitiesForTenant, listIntercompanyAccountsForEntity } from "@/lib/finance/read-queries";

export const metadata = { title: "Intercompany accounts — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let entities: { id: string; code: string; display_name: string }[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      rows = (await listIntercompanyAccountsForEntity(workspace.tenantId, workspace.entityId)) as Record<
        string,
        unknown
      >[];
      entities = (await listEntitiesForTenant(workspace.tenantId)) as typeof entities;
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load intercompany accounts.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Intercompany account mappings"
      moduleLine="Module: Consolidation — Pack 011"
      packNumber={11}
      workspaceName="Consolidation"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <div className="space-y-6">
          <IntercompanyAccountForm workspace={workspace} entities={entities} />
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Mappings for {workspace.entityCode}</h2>
            <WorkflowDataTable
              columns={[
                { key: "counterparty_entity_id", label: "Counterparty" },
                { key: "status", label: "Status" },
                { key: "created_at", label: "Created" },
              ]}
              rows={rows}
            />
          </div>
        </div>
      )}
    </WorkflowPageFrame>
  );
}
