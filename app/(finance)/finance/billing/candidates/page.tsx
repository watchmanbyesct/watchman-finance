/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { BillableCandidateForm } from "@/components/finance/connected/catalog-billing-inventory-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { getCatalogBillingPack013Flags } from "@/lib/finance/catalog-billing-pack013-flags";
import { listBillableCandidatesForTenant } from "@/lib/finance/read-queries";
import Link from "next/link";

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
          <p className="text-xs text-neutral-500">
            Requires `billing.candidate.manage` and `billing` module entitlement. Candidate sources typically come from integration/staging workflows.
          </p>
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
              emptyMessage="No billable candidates yet. Create one above or verify integration staging inputs."
            />
            <p className="mt-2 text-xs text-neutral-500">
              Source links:{" "}
              <Link href="/finance/integration/staging/service-events" className="text-amber-500 hover:text-amber-400">
                service events staging
              </Link>{" "}
              ·{" "}
              <Link href="/finance/integration/pipeline" className="text-amber-500 hover:text-amber-400">
                integration pipeline
              </Link>
              .
            </p>
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
