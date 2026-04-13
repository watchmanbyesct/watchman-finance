/**
 * Copyright 2026 ESCT Holdings Inc.
 * Developed by Owens F. Shepard for ESCT Holdings Inc.
 */

import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { VendorCreateForm } from "@/components/finance/connected/ap-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listVendorsForTenant } from "@/lib/finance/read-queries";

export const metadata = { title: "Vendors — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      rows = (await listVendorsForTenant(workspace.tenantId)) as Record<string, unknown>[];
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load vendors.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Vendors"
      moduleLine="Module: Accounts Payable — Pack 003"
      packNumber={3}
      workspaceName="Accounts Payable"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <VendorCreateForm workspace={workspace} />
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Vendor directory</h2>
            <WorkflowDataTable
              columns={[
                { key: "vendor_code", label: "Code" },
                { key: "display_name", label: "Display name" },
                { key: "legal_name", label: "Legal name" },
              ]}
              rows={rows}
            />
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
