/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { VarianceSnapshotForm } from "@/components/finance/connected/reporting-planning-consolidation-ops-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import {
  listBudgetVersionsForEntity,
  listForecastVersionsForEntity,
  listVarianceSnapshotsForEntity,
} from "@/lib/finance/read-queries";

export const metadata = { title: "Variance — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let loadError: string | null = null;

  let budgetVersions: { id: string; budget_code: string; budget_name: string; fiscal_year: number }[] = [];
  let forecastVersions: { id: string; forecast_code: string; forecast_name: string; fiscal_year: number }[] = [];

  if (workspace) {
    try {
      rows = (await listVarianceSnapshotsForEntity(workspace.tenantId, workspace.entityId)) as Record<
        string,
        unknown
      >[];
      budgetVersions = (await listBudgetVersionsForEntity(workspace.tenantId, workspace.entityId)) as typeof budgetVersions;
      forecastVersions = (await listForecastVersionsForEntity(
        workspace.tenantId,
        workspace.entityId
      )) as typeof forecastVersions;
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load variance snapshots.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Variance snapshots"
      moduleLine="Module: Budgeting & Forecasting — Pack 010"
      packNumber={10}
      workspaceName="Budgeting & Forecasting"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <p className="text-sm text-neutral-500 mb-4">
          Snapshots store comparison results in JSON. Record shells below; enrich <code className="text-xs">snapshot_json</code>{" "}
          when you connect analytics.
        </p>
      )}
      {workspace && !loadError && (
        <div className="mb-6">
          <VarianceSnapshotForm workspace={workspace} budgetVersions={budgetVersions} forecastVersions={forecastVersions} />
        </div>
      )}
      {workspace && !loadError && (
        <WorkflowDataTable
          columns={[
            { key: "snapshot_date", label: "Date" },
            { key: "comparison_type", label: "Comparison" },
            { key: "generated_at", label: "Generated" },
          ]}
          rows={rows}
        />
      )}
    </WorkflowPageFrame>
  );
}
