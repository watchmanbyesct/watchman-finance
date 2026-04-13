import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import {
  listIntegrationEventLogForTenant,
  listIntegrationSyncJobsForTenant,
  listIntegrationSyncRunsForTenant,
} from "@/lib/integration/pack002-read-queries";
import {
  IntegrationEventDispositionForm,
  IntegrationSyncJobUpsertForm,
  IntegrationSyncRunCompleteForm,
  IntegrationSyncRunStartForm,
} from "@/components/finance/connected/integration-pipeline-forms";

export const metadata = { title: "Integration pipeline — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let events: Record<string, unknown>[] = [];
  let jobs: Record<string, unknown>[] = [];
  let runs: Record<string, unknown>[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      const [ev, jb, rn] = await Promise.all([
        listIntegrationEventLogForTenant(workspace.tenantId),
        listIntegrationSyncJobsForTenant(workspace.tenantId),
        listIntegrationSyncRunsForTenant(workspace.tenantId),
      ]);
      events = ev as Record<string, unknown>[];
      jobs = jb as Record<string, unknown>[];
      runs = rn as Record<string, unknown>[];
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load integration pipeline.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Integration event pipeline"
      moduleLine="Pack 002 — Visibility into integration_event_log, sync jobs, and sync runs. Pack 017 adds operator mutations (jobs, runs, event disposition)."
      packNumber={17}
      workspaceName="Integration & staging"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <p className="text-sm text-neutral-500 mb-4">
            Event ingestion is typically driven by integrations and schedulers. Use the Pack 017 forms below to
            register jobs, record manual runs, and disposition stuck events (requires{" "}
            <code className="text-neutral-400">integration.pipeline.operate</code>).
          </p>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
            <IntegrationSyncJobUpsertForm workspace={workspace} />
            <IntegrationSyncRunStartForm
              workspace={workspace}
              jobs={jobs as { id: string; job_key: string; source_system_key: string; target_domain: string }[]}
            />
            <IntegrationSyncRunCompleteForm workspace={workspace} />
            <IntegrationEventDispositionForm workspace={workspace} />
          </div>
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Sync jobs</h2>
            <WorkflowDataTable
              columns={[
                { key: "job_key", label: "Job key" },
                { key: "source_system_key", label: "Source" },
                { key: "target_domain", label: "Domain" },
                { key: "schedule_mode", label: "Schedule" },
                { key: "status", label: "Status" },
              ]}
              rows={jobs}
              emptyMessage="No sync jobs configured for this tenant."
            />
          </div>
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3 mt-8">Sync runs</h2>
            <WorkflowDataTable
              columns={[
                { key: "integration_sync_job_id", label: "Job id" },
                { key: "run_status", label: "Status" },
                { key: "started_at", label: "Started" },
                { key: "completed_at", label: "Completed" },
                { key: "records_promoted", label: "Promoted" },
                { key: "error_summary", label: "Error" },
              ]}
              rows={runs}
              emptyMessage="No sync runs recorded yet."
            />
          </div>
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3 mt-8">Event log</h2>
            <WorkflowDataTable
              columns={[
                { key: "event_type", label: "Event type" },
                { key: "source_system_key", label: "Source" },
                { key: "processing_status", label: "Processing" },
                { key: "occurred_at", label: "Occurred" },
                { key: "error_message", label: "Error" },
              ]}
              rows={events}
              emptyMessage="No integration events recorded yet."
            />
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
