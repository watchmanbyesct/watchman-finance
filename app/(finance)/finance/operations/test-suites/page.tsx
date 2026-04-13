import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { TestSuiteForm } from "@/components/finance/connected/reporting-planning-consolidation-ops-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listTestSuitesForTenant } from "@/lib/finance/read-queries";

export const metadata = { title: "Test suites — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      rows = (await listTestSuitesForTenant(workspace.tenantId)) as Record<string, unknown>[];
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load test suites.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Test suites"
      moduleLine="Module: Operations & QA — Pack 012"
      packNumber={12}
      workspaceName="Operations & QA"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <TestSuiteForm workspace={workspace} />
          <div className="mt-6">
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Tenant suites</h2>
            <WorkflowDataTable
              columns={[
                { key: "suite_code", label: "Code" },
                { key: "suite_name", label: "Name" },
                { key: "suite_category", label: "Category" },
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
