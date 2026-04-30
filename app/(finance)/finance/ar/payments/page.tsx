/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { RecordPaymentForm } from "@/components/finance/connected/ar-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import {
  listCustomersForTenant,
  listInvoicePaymentsForEntity,
  listInvoicesForEntity,
} from "@/lib/finance/read-queries";
import Link from "next/link";

export const metadata = { title: "AR Payments — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let customers: { id: string; customer_code: string; display_name: string }[] = [];
  let invoices: { id: string; customer_id: string; invoice_number: string; invoice_status: string }[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      const [pay, cust, inv] = await Promise.all([
        listInvoicePaymentsForEntity(workspace.tenantId, workspace.entityId),
        listCustomersForTenant(workspace.tenantId),
        listInvoicesForEntity(workspace.tenantId, workspace.entityId),
      ]);
      rows = pay as Record<string, unknown>[];
      customers = cust as typeof customers;
      invoices = inv as typeof invoices;
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load payments.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Customer payments"
      moduleLine="Module: Accounts Receivable — Pack 003"
      packNumber={3}
      workspaceName="Accounts Receivable"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <p className="text-xs text-neutral-500">
            Requires `ar.payment.record`. Customer payment application works best after invoices are issued.
          </p>
          <RecordPaymentForm workspace={workspace} customers={customers} invoices={invoices} />
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Payment history</h2>
            <WorkflowDataTable
              columns={[
                { key: "payment_date", label: "Date" },
                { key: "payment_method", label: "Method" },
                { key: "amount_received", label: "Received" },
                { key: "amount_applied", label: "Applied" },
                { key: "payment_status", label: "Status" },
              ]}
              rows={rows}
              emptyMessage="No customer payments yet. Record a payment above against an issued invoice."
            />
            <p className="mt-2 text-xs text-neutral-500">
              Setup link:{" "}
              <Link href="/finance/ar/invoices" className="text-amber-500 hover:text-amber-400">
                invoices
              </Link>
              .
            </p>
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
