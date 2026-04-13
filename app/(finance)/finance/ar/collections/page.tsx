import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { ArCollectionTaskForm } from "@/components/finance/connected/ar-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listArCollectionTasksForEntity, listCustomersForEntityScope } from "@/lib/finance/read-queries";

export const metadata = { title: "AR collections — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let customers: { id: string; customer_code: string; display_name: string }[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      const [tasks, cust] = await Promise.all([
        listArCollectionTasksForEntity(workspace.tenantId, workspace.entityId),
        listCustomersForEntityScope(workspace.tenantId, workspace.entityId),
      ]);
      rows = tasks as Record<string, unknown>[];
      customers = cust as typeof customers;
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load collection tasks.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Collection tasks"
      moduleLine="Module: Accounts Receivable — Packs 014–015 (schema + permissions)"
      packNumber={15}
      workspaceName="Accounts Receivable"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <ArCollectionTaskForm workspace={workspace} customers={customers} />
          <div className="mt-6">
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Tasks</h2>
            <WorkflowDataTable
              columns={[
                { key: "case_code", label: "Case" },
                { key: "customer_id", label: "Customer" },
                { key: "subject", label: "Subject" },
                { key: "priority", label: "Priority" },
                { key: "task_status", label: "Status" },
              ]}
              rows={rows}
            />
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
