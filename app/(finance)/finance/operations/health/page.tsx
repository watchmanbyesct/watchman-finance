import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { SystemHealthCheckForm } from "@/components/finance/connected/reporting-planning-consolidation-ops-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listSystemHealthChecksForTenant } from "@/lib/finance/read-queries";

export const metadata = { title: "Operations health — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let checks: Record<string, unknown>[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      checks = (await listSystemHealthChecksForTenant(workspace.tenantId)) as Record<string, unknown>[];
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load operations data.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Health & QA"
      moduleLine="Module: Operations & QA — Pack 012"
      packNumber={12}
      workspaceName="Operations & QA"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <SystemHealthCheckForm workspace={workspace} />
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Health checks</h2>
            <WorkflowDataTable
              columns={[
                { key: "module_key", label: "Module" },
                { key: "check_code", label: "Code" },
                { key: "check_name", label: "Name" },
                { key: "check_status", label: "Status" },
                { key: "last_checked_at", label: "Last checked" },
              ]}
              rows={checks}
            />
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
