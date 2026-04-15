/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { EntityRelationshipForm } from "@/components/finance/connected/reporting-planning-consolidation-ops-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listEntitiesForTenant, listEntityRelationshipsForTenant } from "@/lib/finance/read-queries";

export const metadata = { title: "Entity relationships — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let entities: { id: string; code: string; display_name: string }[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      rows = (await listEntityRelationshipsForTenant(workspace.tenantId)) as Record<string, unknown>[];
      entities = (await listEntitiesForTenant(workspace.tenantId)) as typeof entities;
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load entity relationships.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Entity relationships"
      moduleLine="Module: Consolidation — Pack 011"
      packNumber={11}
      workspaceName="Consolidation"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <div className="space-y-6">
          <EntityRelationshipForm workspace={workspace} entities={entities} />
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Relationships</h2>
            <WorkflowDataTable
              columns={[
                { key: "relationship_type", label: "Type" },
                { key: "parent_entity_id", label: "Parent entity" },
                { key: "child_entity_id", label: "Child entity" },
                { key: "ownership_percentage", label: "Own %" },
                { key: "status", label: "Status" },
              ]}
              rows={rows}
            />
          </div>
        </div>
      )}
    </WorkflowPageFrame>
  );
}
