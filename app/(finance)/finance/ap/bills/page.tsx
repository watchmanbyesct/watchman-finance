/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { BillDraftForm } from "@/components/finance/connected/ap-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listBillsForEntity, listVendorsForTenant } from "@/lib/finance/read-queries";

export const metadata = { title: "Bills — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let vendors: { id: string; vendor_code: string; display_name: string }[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      const [b, v] = await Promise.all([
        listBillsForEntity(workspace.tenantId, workspace.entityId),
        listVendorsForTenant(workspace.tenantId),
      ]);
      rows = b as Record<string, unknown>[];
      vendors = v as typeof vendors;
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load bills.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Bills"
      moduleLine="Module: Accounts Payable — Pack 003"
      packNumber={3}
      workspaceName="Accounts Payable"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <BillDraftForm workspace={workspace} vendors={vendors} />
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Bills</h2>
            <WorkflowDataTable
              columns={[
                { key: "bill_number", label: "Number" },
                { key: "bill_status", label: "Status" },
                { key: "vendor_id", label: "Vendor id" },
                { key: "total_amount", label: "Total" },
                { key: "balance_due", label: "Balance" },
              ]}
              rows={rows}
            />
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
