import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { LeaveTypeCreateForm } from "@/components/finance/connected/leave-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listLeaveTypesForTenant } from "@/lib/finance/read-queries";

export const metadata = { title: "Leave types — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      rows = (await listLeaveTypesForTenant(workspace.tenantId)) as Record<string, unknown>[];
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load leave types.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Leave types"
      moduleLine="Module: Leave & Accruals — Pack 005"
      packNumber={5}
      workspaceName="Leave & Accruals"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <LeaveTypeCreateForm workspace={workspace} />
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Types</h2>
            <WorkflowDataTable
              columns={[
                { key: "leave_code", label: "Code" },
                { key: "leave_name", label: "Name" },
                { key: "leave_category", label: "Category" },
                { key: "is_paid", label: "Paid" },
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
