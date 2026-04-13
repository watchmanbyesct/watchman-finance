/**
 * Copyright 2026 ESCT Holdings Inc.
 * Developed by Owens F. Shepard for ESCT Holdings Inc.
 */

import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { Pack002StageServiceEventForm } from "@/components/integration/pack002-workflow-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listStagedServiceEventsForTenant } from "@/lib/integration/pack002-read-queries";

export const metadata = { title: "Staging — Service events — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      rows = (await listStagedServiceEventsForTenant(workspace.tenantId)) as Record<string, unknown>[];
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load staged service events.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Staging — Service events"
      moduleLine="Pack 002 — staged_service_events for billing and downstream commercial workflows."
      packNumber={2}
      workspaceName="Integration & staging"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <Pack002StageServiceEventForm workspace={workspace} />
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Queue</h2>
            <WorkflowDataTable
              columns={[
                { key: "source_record_id", label: "Source id" },
                { key: "service_type", label: "Service type" },
                { key: "event_date", label: "Event date" },
                { key: "validation_status", label: "Validation" },
                { key: "received_at", label: "Received" },
              ]}
              rows={rows}
            />
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
