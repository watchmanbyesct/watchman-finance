/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { TaxJurisdictionForm } from "@/components/finance/connected/tax-workflow-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listTaxJurisdictionsForTenant } from "@/lib/finance/read-queries";

export const metadata = { title: "Tax jurisdictions — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      rows = (await listTaxJurisdictionsForTenant(workspace.tenantId)) as Record<string, unknown>[];
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load tax jurisdictions.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Tax jurisdictions"
      moduleLine="Module: Tax — Packs 014–015 (schema + permissions)"
      packNumber={15}
      workspaceName="Tax"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <TaxJurisdictionForm workspace={workspace} />
          <div className="mt-6">
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Jurisdictions</h2>
            <WorkflowDataTable
              columns={[
                { key: "jurisdiction_code", label: "Code" },
                { key: "jurisdiction_name", label: "Name" },
                { key: "country_code", label: "Country" },
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
