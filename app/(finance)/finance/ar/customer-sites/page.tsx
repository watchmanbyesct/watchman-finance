/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { CustomerSiteCreateForm } from "@/components/finance/connected/ar-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listCustomerSitesForTenant, listCustomersForTenant } from "@/lib/finance/read-queries";

export const metadata = { title: "Customer sites — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let customers: { id: string; customer_code: string; display_name: string }[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      const [sites, cust] = await Promise.all([
        listCustomerSitesForTenant(workspace.tenantId),
        listCustomersForTenant(workspace.tenantId),
      ]);
      rows = sites as Record<string, unknown>[];
      customers = cust as typeof customers;
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load customer sites.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Customer sites"
      moduleLine="Module: Accounts Receivable — Pack 003"
      packNumber={3}
      workspaceName="Accounts Receivable"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <CustomerSiteCreateForm workspace={workspace} customers={customers} />
          <div className="mt-6">
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Sites</h2>
            <WorkflowDataTable
              columns={[
                { key: "site_code", label: "Code" },
                { key: "site_name", label: "Name" },
                { key: "customer_id", label: "Customer" },
                { key: "status", label: "Status" },
              ]}
              rows={rows}
            />
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
