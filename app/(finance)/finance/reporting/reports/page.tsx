import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { ReportDefinitionForm } from "@/components/finance/connected/reporting-planning-consolidation-ops-forms";
import { ReportSnapshotAutomationForm } from "@/components/finance/connected/report-snapshot-automation-form";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listReportDefinitionsForTenant, listReportExecutionLogForTenant } from "@/lib/finance/read-queries";

export const metadata = { title: "Reports — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  const defaultAsOf = new Date().toISOString().slice(0, 10);
  let rows: Record<string, unknown>[] = [];
  let execLog: Record<string, unknown>[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      const [defs, log] = await Promise.all([
        listReportDefinitionsForTenant(workspace.tenantId),
        listReportExecutionLogForTenant(workspace.tenantId),
      ]);
      rows = defs as Record<string, unknown>[];
      execLog = log as Record<string, unknown>[];
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load report definitions.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Report definitions"
      moduleLine="Module: Reporting — Packs 009 & 017 (definitions + snapshot automation & execution log)."
      packNumber={17}
      workspaceName="Reporting"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <ReportSnapshotAutomationForm
            workspace={workspace}
            definitions={rows as { id: string; report_code: string; report_name: string }[]}
            defaultAsOf={defaultAsOf}
          />
          <ReportDefinitionForm workspace={workspace} />
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Definitions</h2>
            <WorkflowDataTable
              columns={[
                { key: "report_code", label: "Code" },
                { key: "report_name", label: "Name" },
                { key: "report_category", label: "Category" },
                { key: "output_type", label: "Output" },
                { key: "status", label: "Status" },
              ]}
              rows={rows}
            />
          </div>
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3 mt-8">Automation run log</h2>
            <WorkflowDataTable
              columns={[
                { key: "report_definition_id", label: "Report id" },
                { key: "as_of_date", label: "As-of" },
                { key: "execution_status", label: "Status" },
                { key: "report_snapshot_id", label: "Snapshot id" },
                { key: "error_message", label: "Error" },
                { key: "started_at", label: "Started" },
              ]}
              rows={execLog}
              emptyMessage="No automation runs logged yet."
            />
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
