/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { CreditMemoCreateForm } from "@/components/finance/connected/ar-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import {
  listCreditMemosForEntity,
  listCustomersForTenant,
  listInvoicesForEntity,
} from "@/lib/finance/read-queries";

export const metadata = { title: "Credit memos — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let customers: { id: string; customer_code: string; display_name: string }[] = [];
  let invoices: { id: string; customer_id: string; invoice_number: string; invoice_status: string }[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      const [memos, cust, inv] = await Promise.all([
        listCreditMemosForEntity(workspace.tenantId, workspace.entityId),
        listCustomersForTenant(workspace.tenantId),
        listInvoicesForEntity(workspace.tenantId, workspace.entityId),
      ]);
      rows = memos as Record<string, unknown>[];
      customers = cust as typeof customers;
      invoices = inv as typeof invoices;
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load credit memos.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Credit memos"
      moduleLine="Module: Accounts Receivable — Pack 003"
      packNumber={3}
      workspaceName="Accounts Receivable"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <CreditMemoCreateForm workspace={workspace} customers={customers} invoices={invoices} />
          <div className="mt-6">
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Memos (this entity)</h2>
            <WorkflowDataTable
              columns={[
                { key: "memo_number", label: "Number" },
                { key: "memo_status", label: "Status" },
                { key: "total_amount", label: "Total" },
                { key: "remaining_amount", label: "Remaining" },
                { key: "customer_id", label: "Customer" },
              ]}
              rows={rows}
            />
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
