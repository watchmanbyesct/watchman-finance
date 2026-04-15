/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { InvoiceDraftForm } from "@/components/finance/connected/ar-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listCustomersForTenant, listInvoicesForEntity } from "@/lib/finance/read-queries";
import { getAccountsByEntity } from "@/modules/finance-core/repositories/finance-core-repository";

export const metadata = { title: "Invoices — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let customers: { id: string; customer_code: string; display_name: string }[] = [];
  let revenueAccounts: { id: string; code: string; name: string; accountType: string }[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      const [inv, cust, acct] = await Promise.all([
        listInvoicesForEntity(workspace.tenantId, workspace.entityId),
        listCustomersForTenant(workspace.tenantId),
        getAccountsByEntity(workspace.tenantId, workspace.entityId),
      ]);
      rows = inv as Record<string, unknown>[];
      customers = cust as typeof customers;
      revenueAccounts = acct.map((a) => ({
        id: a.id,
        code: a.code,
        name: a.name,
        accountType: a.accountType,
      }));
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load invoices.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Invoices"
      moduleLine="Module: Accounts Receivable — Pack 003"
      packNumber={3}
      workspaceName="Accounts Receivable"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <InvoiceDraftForm workspace={workspace} customers={customers} revenueAccounts={revenueAccounts} />
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Open invoices</h2>
            <WorkflowDataTable
              columns={[
                { key: "invoice_number", label: "Number" },
                { key: "invoice_status", label: "Status" },
                { key: "customer_id", label: "Customer id" },
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
