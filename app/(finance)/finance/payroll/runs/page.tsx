import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { PayrollRunCreateForm, PayrollRunLifecycleForm } from "@/components/finance/connected/payroll-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listPayGroupsForEntity, listPayPeriodsForEntity, listPayrollRunsForEntity } from "@/lib/finance/read-queries";

export const metadata = { title: "Payroll runs — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let groups: { id: string; group_code: string; group_name: string }[] = [];
  let periods: { id: string; period_name: string; pay_group_id: string }[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      const [r, g, p] = await Promise.all([
        listPayrollRunsForEntity(workspace.tenantId, workspace.entityId),
        listPayGroupsForEntity(workspace.tenantId, workspace.entityId),
        listPayPeriodsForEntity(workspace.tenantId, workspace.entityId),
      ]);
      rows = r as Record<string, unknown>[];
      groups = g as typeof groups;
      periods = p as typeof periods;
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load payroll runs.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Payroll runs"
      moduleLine="Module: Payroll — Pack 004"
      packNumber={4}
      workspaceName="Payroll"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <PayrollRunCreateForm workspace={workspace} payGroups={groups} payPeriods={periods} />
          <PayrollRunLifecycleForm
            workspace={workspace}
            runs={rows.map((row) => ({
              id: String(row.id),
              run_number: String(row.run_number),
              run_status: String(row.run_status),
            }))}
          />
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Runs</h2>
            <WorkflowDataTable
              columns={[
                { key: "run_number", label: "Run #" },
                { key: "run_status", label: "Status" },
                { key: "run_type", label: "Type" },
                { key: "period_start", label: "Period start" },
                { key: "period_end", label: "Period end" },
              ]}
              rows={rows}
            />
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
