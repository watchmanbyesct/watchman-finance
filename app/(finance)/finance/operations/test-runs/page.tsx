/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { StartTestRunForm } from "@/components/finance/connected/reporting-planning-consolidation-ops-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listTestRunsForTenant, listTestSuitesForOperationsPicker } from "@/lib/finance/read-queries";

export const metadata = { title: "Test runs — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let suites: { id: string; suite_code: string; suite_name: string }[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      rows = (await listTestRunsForTenant(workspace.tenantId)) as Record<string, unknown>[];
      suites = (await listTestSuitesForOperationsPicker(workspace.tenantId)) as typeof suites;
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load test runs.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Test runs"
      moduleLine="Module: Operations & QA — Pack 012"
      packNumber={12}
      workspaceName="Operations & QA"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <StartTestRunForm workspace={workspace} suites={suites} />
          <div className="mt-6">
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Runs</h2>
            <WorkflowDataTable
              columns={[
                { key: "test_suite_id", label: "Suite" },
                { key: "run_environment", label: "Env" },
                { key: "run_status", label: "Status" },
                { key: "started_at", label: "Started" },
              ]}
              rows={rows}
            />
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
