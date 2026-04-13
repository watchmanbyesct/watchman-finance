import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import {
  TenantActivationChecklistForm,
  TenantActivationTaskForm,
} from "@/components/finance/connected/reporting-planning-consolidation-ops-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import {
  listTenantActivationChecklistsForTenant,
  listTenantActivationTasksForTenant,
} from "@/lib/finance/read-queries";

export const metadata = { title: "Tenant activation — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let checklists: { id: string; checklist_name: string; activation_status: string }[] = [];
  let tasks: Record<string, unknown>[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      checklists = (await listTenantActivationChecklistsForTenant(workspace.tenantId)) as typeof checklists;
      tasks = (await listTenantActivationTasksForTenant(workspace.tenantId)) as Record<string, unknown>[];
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load activation data.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Tenant activation"
      moduleLine="Module: Commercial readiness — Pack 011"
      packNumber={11}
      workspaceName="Commercial readiness"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TenantActivationChecklistForm workspace={workspace} />
            <TenantActivationTaskForm workspace={workspace} checklists={checklists} />
          </div>
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Checklists</h2>
            <WorkflowDataTable
              columns={[
                { key: "checklist_name", label: "Name" },
                { key: "activation_status", label: "Status" },
                { key: "created_at", label: "Created" },
              ]}
              rows={checklists as unknown as Record<string, unknown>[]}
            />
          </div>
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Tasks</h2>
            <WorkflowDataTable
              columns={[
                { key: "task_code", label: "Code" },
                { key: "task_name", label: "Name" },
                { key: "task_status", label: "Status" },
                { key: "tenant_activation_checklist_id", label: "Checklist" },
              ]}
              rows={tasks}
            />
          </div>
        </div>
      )}
    </WorkflowPageFrame>
  );
}
