/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { RunLeaveAccrualsForm } from "@/components/finance/connected/leave-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listLeaveBalanceLedgersForEntity } from "@/lib/finance/read-queries";

export const metadata = { title: "Leave balances — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      rows = (await listLeaveBalanceLedgersForEntity(workspace.tenantId, workspace.entityId)) as Record<
        string,
        unknown
      >[];
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load balance ledger.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Leave balance ledger"
      moduleLine="Module: Leave & Accruals — Pack 005"
      packNumber={5}
      workspaceName="Leave & Accruals"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <div className="space-y-6">
          <RunLeaveAccrualsForm workspace={workspace} />
          <div>
          <p className="text-sm text-neutral-500 mb-4">
            Ledger entries from accruals, usage, and adjustments. Posting workflows can extend this view later.
          </p>
          <WorkflowDataTable
            columns={[
              { key: "entry_type", label: "Type" },
              { key: "entry_date", label: "Date" },
              { key: "hours_delta", label: "Δ hours" },
              { key: "balance_after_hours", label: "Balance after" },
            ]}
            rows={rows}
          />
          </div>
        </div>
      )}
    </WorkflowPageFrame>
  );
}
