import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { TestResultForm } from "@/components/finance/connected/reporting-planning-consolidation-ops-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listTestResultsForTenant, listTestRunsForTenant } from "@/lib/finance/read-queries";

export const metadata = { title: "Test results — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let testRuns: { id: string; test_suite_id: string; run_status: string; run_environment: string }[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      rows = (await listTestResultsForTenant(workspace.tenantId)) as Record<string, unknown>[];
      testRuns = (await listTestRunsForTenant(workspace.tenantId)) as typeof testRuns;
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load test results.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Test results"
      moduleLine="Module: Operations & QA — Pack 012"
      packNumber={12}
      workspaceName="Operations & QA"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <TestResultForm workspace={workspace} testRuns={testRuns} />
          <div className="mt-6">
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Results</h2>
            <WorkflowDataTable
              columns={[
                { key: "test_run_id", label: "Run" },
                { key: "test_case_code", label: "Case" },
                { key: "result_status", label: "Result" },
                { key: "severity", label: "Severity" },
              ]}
              rows={rows}
            />
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
