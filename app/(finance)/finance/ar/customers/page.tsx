/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { CustomerCreateForm } from "@/components/finance/connected/ar-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listCustomersForTenant } from "@/lib/finance/read-queries";
import Link from "next/link";

export const metadata = { title: "Customers — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      rows = (await listCustomersForTenant(workspace.tenantId)) as Record<string, unknown>[];
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load customers.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Customers"
      moduleLine="Module: Accounts Receivable — Pack 003"
      packNumber={3}
      workspaceName="Accounts Receivable"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <p className="text-xs text-neutral-500">
            Requires `ar.customer.manage` to create rows. If customer sites are empty later, add at least one customer here first.
          </p>
          <CustomerCreateForm workspace={workspace} />
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Directory</h2>
            <WorkflowDataTable
              columns={[
                { key: "customer_code", label: "Code" },
                { key: "display_name", label: "Display name" },
                { key: "legal_name", label: "Legal name" },
                { key: "payment_terms_days", label: "Terms (days)" },
              ]}
              rows={rows}
              emptyMessage="No customers yet. Create a customer above, then continue to `Customer sites`."
            />
            <p className="mt-2 text-xs text-neutral-500">
              Next step:{" "}
              <Link href="/finance/ar/customer-sites" className="text-amber-500 hover:text-amber-400">
                set up customer sites
              </Link>
              .
            </p>
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
