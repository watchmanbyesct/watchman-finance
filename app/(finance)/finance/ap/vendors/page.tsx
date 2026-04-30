/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { VendorCreateForm } from "@/components/finance/connected/ap-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listVendorsForTenant } from "@/lib/finance/read-queries";
import Link from "next/link";

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
          <p className="text-xs text-neutral-500">
            Requires `ap.vendor.manage` to create rows. If bill entry is blocked, confirm at least one vendor exists first.
          </p>
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
              emptyMessage="No vendors yet. Create a vendor above, then continue to `Bills`."
            />
            <p className="mt-2 text-xs text-neutral-500">
              Next step:{" "}
              <Link href="/finance/ap/bills" className="text-amber-500 hover:text-amber-400">
                enter AP bills
              </Link>
              .
            </p>
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
