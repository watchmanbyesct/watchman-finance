import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { PayPeriodCreateForm } from "@/components/finance/connected/payroll-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listPayGroupsForEntity, listPayPeriodsForEntity } from "@/lib/finance/read-queries";

export const metadata = { title: "Pay periods — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let groups: { id: string; group_code: string; group_name: string }[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      const [p, g] = await Promise.all([
        listPayPeriodsForEntity(workspace.tenantId, workspace.entityId),
        listPayGroupsForEntity(workspace.tenantId, workspace.entityId),
      ]);
      rows = p as Record<string, unknown>[];
      groups = g as typeof groups;
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load pay periods.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Pay periods"
      moduleLine="Module: Payroll — Pack 004"
      packNumber={4}
      workspaceName="Payroll"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <PayPeriodCreateForm workspace={workspace} payGroups={groups} />
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Periods</h2>
            <WorkflowDataTable
              columns={[
                { key: "period_name", label: "Name" },
                { key: "period_start", label: "Start" },
                { key: "period_end", label: "End" },
                { key: "pay_date", label: "Pay date" },
                { key: "status", label: "Status" },
              ]}
              rows={rows}
            />
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
