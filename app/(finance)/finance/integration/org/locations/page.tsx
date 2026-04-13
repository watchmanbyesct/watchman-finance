import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { Pack002CreateLocationForm } from "@/components/integration/pack002-workflow-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listBranchesForTenant, listLocationsForTenant } from "@/lib/integration/pack002-read-queries";

export const metadata = { title: "Locations — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let branches: { id: string; code: string; name: string }[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      const [loc, br] = await Promise.all([
        listLocationsForTenant(workspace.tenantId),
        listBranchesForTenant(workspace.tenantId),
      ]);
      rows = loc as Record<string, unknown>[];
      branches = br as typeof branches;
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load locations.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Locations"
      moduleLine="Pack 002 — Tenant locations; optional branch link (requires tenant.update)."
      packNumber={2}
      workspaceName="Integration & staging"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <Pack002CreateLocationForm workspace={workspace} branches={branches} />
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Locations</h2>
            <WorkflowDataTable
              columns={[
                { key: "name", label: "Name" },
                { key: "location_type", label: "Type" },
                { key: "city", label: "City" },
                { key: "state", label: "State" },
                { key: "branch_id", label: "Branch id" },
              ]}
              rows={rows}
            />
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
