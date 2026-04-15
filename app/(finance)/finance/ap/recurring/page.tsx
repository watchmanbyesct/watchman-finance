/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { ApRecurringChargeForm } from "@/components/finance/connected/ap-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listApRecurringVendorChargesForEntity, listVendorsForEntityScope } from "@/lib/finance/read-queries";

export const metadata = { title: "AP recurring charges — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let vendors: { id: string; vendor_code: string; display_name: string }[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      const [charges, ven] = await Promise.all([
        listApRecurringVendorChargesForEntity(workspace.tenantId, workspace.entityId),
        listVendorsForEntityScope(workspace.tenantId, workspace.entityId),
      ]);
      rows = charges as Record<string, unknown>[];
      vendors = ven as typeof vendors;
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load recurring charges.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Recurring vendor charges"
      moduleLine="Module: Accounts Payable — Packs 014–015 (schema + permissions)"
      packNumber={15}
      workspaceName="Accounts Payable"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <ApRecurringChargeForm workspace={workspace} vendors={vendors} />
          <div className="mt-6">
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Charges</h2>
            <WorkflowDataTable
              columns={[
                { key: "charge_code", label: "Code" },
                { key: "vendor_id", label: "Vendor" },
                { key: "amount_estimate", label: "Estimate" },
                { key: "cadence", label: "Cadence" },
                { key: "next_expected_date", label: "Next" },
                { key: "is_active", label: "Active" },
              ]}
              rows={rows}
            />
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
