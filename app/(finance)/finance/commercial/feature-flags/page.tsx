import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { TenantFeatureFlagForm } from "@/components/finance/connected/reporting-planning-consolidation-ops-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listFeatureFlagDefinitions, listTenantFeatureFlagsForTenant } from "@/lib/finance/read-queries";

export const metadata = { title: "Feature flags — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let definitions: { id: string; flag_key: string; flag_name: string }[] = [];
  let tenantFlags: Record<string, unknown>[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      definitions = (await listFeatureFlagDefinitions()) as typeof definitions;
      tenantFlags = (await listTenantFeatureFlagsForTenant(workspace.tenantId)) as Record<string, unknown>[];
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load feature flags.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Tenant feature flags"
      moduleLine="Module: Commercial readiness — Pack 011"
      packNumber={11}
      workspaceName="Commercial readiness"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <div className="space-y-6">
          <TenantFeatureFlagForm workspace={workspace} definitions={definitions} />
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Platform definitions</h2>
            <WorkflowDataTable
              columns={[
                { key: "flag_key", label: "Key" },
                { key: "flag_name", label: "Name" },
                { key: "flag_category", label: "Category" },
                { key: "status", label: "Status" },
              ]}
              rows={definitions as unknown as Record<string, unknown>[]}
            />
          </div>
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">This tenant</h2>
            <WorkflowDataTable
              columns={[
                { key: "feature_flag_definition_id", label: "Definition" },
                { key: "enabled", label: "Enabled" },
                { key: "enabled_at", label: "Enabled at" },
                { key: "updated_at", label: "Updated" },
              ]}
              rows={tenantFlags}
            />
          </div>
        </div>
      )}
    </WorkflowPageFrame>
  );
}
