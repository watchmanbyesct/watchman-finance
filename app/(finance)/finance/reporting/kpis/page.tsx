import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { KpiDefinitionForm } from "@/components/finance/connected/reporting-planning-consolidation-ops-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listKpiDefinitionsForTenant } from "@/lib/finance/read-queries";

export const metadata = { title: "KPI definitions — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      rows = (await listKpiDefinitionsForTenant(workspace.tenantId)) as Record<string, unknown>[];
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load KPI definitions.";
    }
  }

  return (
    <WorkflowPageFrame
      title="KPI definitions"
      moduleLine="Module: Reporting — Pack 009"
      packNumber={9}
      workspaceName="Reporting"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <KpiDefinitionForm workspace={workspace} />
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">KPIs</h2>
            <WorkflowDataTable
              columns={[
                { key: "kpi_code", label: "Code" },
                { key: "kpi_name", label: "Name" },
                { key: "kpi_category", label: "Category" },
                { key: "measure_type", label: "Measure" },
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
