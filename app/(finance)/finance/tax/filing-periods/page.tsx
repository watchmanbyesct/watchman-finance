/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { TaxFilingPeriodForm } from "@/components/finance/connected/tax-workflow-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listTaxFilingPeriodsForEntity, listTaxJurisdictionsForTenant } from "@/lib/finance/read-queries";

export const metadata = { title: "Tax filing periods — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let jurisdictions: { id: string; jurisdiction_code: string; jurisdiction_name: string }[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      const [per, jur] = await Promise.all([
        listTaxFilingPeriodsForEntity(workspace.tenantId, workspace.entityId),
        listTaxJurisdictionsForTenant(workspace.tenantId),
      ]);
      rows = per as Record<string, unknown>[];
      jurisdictions = jur as typeof jurisdictions;
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load filing periods.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Tax filing periods"
      moduleLine="Module: Tax — Packs 014–015 (schema + permissions)"
      packNumber={15}
      workspaceName="Tax"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <TaxFilingPeriodForm workspace={workspace} jurisdictions={jurisdictions} />
          <div className="mt-6">
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Periods</h2>
            <WorkflowDataTable
              columns={[
                { key: "period_code", label: "Code" },
                { key: "period_start", label: "Start" },
                { key: "period_end", label: "End" },
                { key: "filing_due_date", label: "Due" },
                { key: "filing_status", label: "Status" },
              ]}
              rows={rows}
            />
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
