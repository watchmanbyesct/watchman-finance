/**
 * Copyright 2026 ESCT Holdings Inc.
 * Developed by Owens F. Shepard for ESCT Holdings Inc.
 */

import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { BudgetLineForm, BudgetVersionForm } from "@/components/finance/connected/reporting-planning-consolidation-ops-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listBudgetVersionsForEntity } from "@/lib/finance/read-queries";

export const metadata = { title: "Budgets — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let budgetOptions: { id: string; budget_code: string; budget_name: string; fiscal_year: number }[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      const bv = await listBudgetVersionsForEntity(workspace.tenantId, workspace.entityId);
      rows = bv as Record<string, unknown>[];
      budgetOptions = bv as typeof budgetOptions;
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load budgets.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Budget versions"
      moduleLine="Module: Budgeting & Forecasting — Pack 010"
      packNumber={10}
      workspaceName="Budgeting & Forecasting"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <BudgetVersionForm workspace={workspace} />
          <BudgetLineForm workspace={workspace} budgetVersions={budgetOptions} />
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Versions</h2>
            <WorkflowDataTable
              columns={[
                { key: "budget_code", label: "Code" },
                { key: "budget_name", label: "Name" },
                { key: "fiscal_year", label: "Year" },
                { key: "budget_status", label: "Status" },
              ]}
              rows={rows}
            />
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
