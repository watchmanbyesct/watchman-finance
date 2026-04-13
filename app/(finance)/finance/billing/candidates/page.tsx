/**
 * Copyright 2026 ESCT Holdings Inc.
 * Developed by Owens F. Shepard for ESCT Holdings Inc.
 */

import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { BillableCandidateForm } from "@/components/finance/connected/catalog-billing-inventory-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { getCatalogBillingPack013Flags } from "@/lib/finance/catalog-billing-pack013-flags";
import { listBillableCandidatesForTenant } from "@/lib/finance/read-queries";

export const metadata = { title: "Billable candidates — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let loadError: string | null = null;
  const p13 = workspace ? await getCatalogBillingPack013Flags(workspace.tenantId) : null;

  if (workspace) {
    try {
      rows = (await listBillableCandidatesForTenant(workspace.tenantId)) as Record<string, unknown>[];
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load candidates.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Billing — billable event candidates"
      moduleLine="Pack 007 schema · Pack 013: billing.candidate.manage (+ billing module entitlement)"
      packNumber={7}
      workspaceName="Billing"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && p13 && (
        <>
          <BillableCandidateForm workspace={workspace} canManage={p13.canManageCandidates} />
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Candidates</h2>
            <WorkflowDataTable
              columns={[
                { key: "source_table", label: "Source" },
                { key: "source_record_id", label: "Record" },
                { key: "candidate_status", label: "Status" },
                { key: "candidate_date", label: "Date" },
                { key: "quantity", label: "Qty" },
              ]}
              rows={rows}
            />
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
