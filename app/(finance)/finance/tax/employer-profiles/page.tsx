/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { TaxEmployerProfileForm } from "@/components/finance/connected/tax-workflow-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listTaxEmployerProfilesForEntity, listTaxJurisdictionsForTenant } from "@/lib/finance/read-queries";

export const metadata = { title: "Employer tax profiles — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let jurisdictions: { id: string; jurisdiction_code: string; jurisdiction_name: string }[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      const [prof, jur] = await Promise.all([
        listTaxEmployerProfilesForEntity(workspace.tenantId, workspace.entityId),
        listTaxJurisdictionsForTenant(workspace.tenantId),
      ]);
      rows = prof as Record<string, unknown>[];
      jurisdictions = jur as typeof jurisdictions;
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load employer profiles.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Employer tax profiles"
      moduleLine="Module: Tax — Packs 014–015 (schema + permissions)"
      packNumber={15}
      workspaceName="Tax"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <TaxEmployerProfileForm workspace={workspace} jurisdictions={jurisdictions} />
          <div className="mt-6">
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Profiles</h2>
            <WorkflowDataTable
              columns={[
                { key: "tax_jurisdiction_id", label: "Jurisdiction ID" },
                { key: "registration_reference", label: "Registration" },
                { key: "profile_status", label: "Status" },
                { key: "effective_date", label: "Effective" },
              ]}
              rows={rows}
            />
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
