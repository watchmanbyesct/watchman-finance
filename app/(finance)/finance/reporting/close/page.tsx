/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { CloseChecklistForm } from "@/components/finance/connected/reporting-planning-consolidation-ops-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listCloseChecklistsForEntity } from "@/lib/finance/read-queries";

export const metadata = { title: "Period close — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      rows = (await listCloseChecklistsForEntity(workspace.tenantId, workspace.entityId)) as Record<
        string,
        unknown
      >[];
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load close checklists.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Close checklists"
      moduleLine="Module: Reporting — Pack 009"
      packNumber={9}
      workspaceName="Reporting"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <div className="space-y-6">
          <CloseChecklistForm workspace={workspace} />
          <div>
          <p className="text-sm text-neutral-500 mb-4">
            Entity-scoped checklists below. Close task rows and status transitions can extend this workflow later.
          </p>
          <WorkflowDataTable
            columns={[
              { key: "checklist_name", label: "Name" },
              { key: "checklist_status", label: "Status" },
              { key: "close_period_start", label: "Period start" },
              { key: "close_period_end", label: "Period end" },
            ]}
            rows={rows}
          />
          </div>
        </div>
      )}
    </WorkflowPageFrame>
  );
}
