/**
 * Copyright 2026 ESCT Holdings Inc.
 * Developed by Owens F. Shepard for ESCT Holdings Inc.
 */

import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { VendorPaymentForm } from "@/components/finance/connected/ap-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listBillsForEntity, listVendorPaymentsForEntity, listVendorsForTenant } from "@/lib/finance/read-queries";

export const metadata = { title: "AP Payments — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let vendors: { id: string; vendor_code: string; display_name: string }[] = [];
  let bills: { id: string; vendor_id: string; bill_number: string; bill_status: string }[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      const [p, v, b] = await Promise.all([
        listVendorPaymentsForEntity(workspace.tenantId, workspace.entityId),
        listVendorsForTenant(workspace.tenantId),
        listBillsForEntity(workspace.tenantId, workspace.entityId),
      ]);
      rows = p as Record<string, unknown>[];
      vendors = v as typeof vendors;
      bills = b as typeof bills;
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load vendor payments.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Vendor payments"
      moduleLine="Module: Accounts Payable — Pack 003"
      packNumber={3}
      workspaceName="Accounts Payable"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <VendorPaymentForm workspace={workspace} vendors={vendors} bills={bills} />
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Payment history</h2>
            <WorkflowDataTable
              columns={[
                { key: "payment_date", label: "Date" },
                { key: "payment_method", label: "Method" },
                { key: "amount_paid", label: "Paid" },
                { key: "amount_applied", label: "Applied" },
                { key: "payment_status", label: "Status" },
              ]}
              rows={rows}
            />
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
