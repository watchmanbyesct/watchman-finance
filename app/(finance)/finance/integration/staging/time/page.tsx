import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { Pack002StageTimeForm } from "@/components/integration/pack002-workflow-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listStagedTimeEntriesForTenant } from "@/lib/integration/pack002-read-queries";

export const metadata = { title: "Staging — Time — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      rows = (await listStagedTimeEntriesForTenant(workspace.tenantId)) as Record<string, unknown>[];
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load staged time.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Staging — Approved time"
      moduleLine="Pack 002 — staged_time_entries for payroll ingestion (mirrors Operations integration)."
      packNumber={2}
      workspaceName="Integration & staging"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <Pack002StageTimeForm workspace={workspace} />
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Queue</h2>
            <WorkflowDataTable
              columns={[
                { key: "source_record_id", label: "Source id" },
                { key: "employee_source_record_id", label: "Employee src" },
                { key: "approval_status", label: "Approval" },
                { key: "validation_status", label: "Validation" },
                { key: "pay_period_start", label: "Period start" },
                { key: "pay_period_end", label: "Period end" },
              ]}
              rows={rows}
            />
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
