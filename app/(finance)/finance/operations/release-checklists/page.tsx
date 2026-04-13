import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { ReleaseChecklistForm } from "@/components/finance/connected/reporting-planning-consolidation-ops-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listReleaseChecklistsForTenant, listReleaseVersionsForTenant } from "@/lib/finance/read-queries";

export const metadata = { title: "Release checklists — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let releases: { id: string; release_code: string; release_name: string }[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      rows = (await listReleaseChecklistsForTenant(workspace.tenantId)) as Record<string, unknown>[];
      releases = (await listReleaseVersionsForTenant(workspace.tenantId)) as typeof releases;
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load release checklists.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Release checklists"
      moduleLine="Module: Operations & QA — Pack 012"
      packNumber={12}
      workspaceName="Operations & QA"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <ReleaseChecklistForm workspace={workspace} releases={releases} />
          <div className="mt-6">
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Checklists</h2>
            <WorkflowDataTable
              columns={[
                { key: "checklist_name", label: "Name" },
                { key: "checklist_status", label: "Status" },
                { key: "release_version_id", label: "Release" },
              ]}
              rows={rows}
            />
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
