/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { ForecastLineForm, ForecastVersionForm } from "@/components/finance/connected/reporting-planning-consolidation-ops-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listForecastVersionsForEntity } from "@/lib/finance/read-queries";

export const metadata = { title: "Forecasts — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let forecastOptions: { id: string; forecast_code: string; forecast_name: string; fiscal_year: number }[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      const fv = await listForecastVersionsForEntity(workspace.tenantId, workspace.entityId);
      rows = fv as Record<string, unknown>[];
      forecastOptions = fv as typeof forecastOptions;
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load forecasts.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Forecast versions"
      moduleLine="Module: Budgeting & Forecasting — Pack 010"
      packNumber={10}
      workspaceName="Budgeting & Forecasting"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <ForecastVersionForm workspace={workspace} />
          <ForecastLineForm workspace={workspace} forecastVersions={forecastOptions} />
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Versions</h2>
            <WorkflowDataTable
              columns={[
                { key: "forecast_code", label: "Code" },
                { key: "forecast_name", label: "Name" },
                { key: "fiscal_year", label: "Year" },
                { key: "forecast_status", label: "Status" },
                { key: "basis_type", label: "Basis" },
              ]}
              rows={rows}
            />
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
