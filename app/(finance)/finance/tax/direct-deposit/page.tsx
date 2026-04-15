/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { DirectDepositBatchForm, DirectDepositBatchItemForm } from "@/components/finance/connected/tax-workflow-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import {
  listDirectDepositBatchItemsForEntity,
  listDirectDepositBatchesForEntity,
  listEmployeePayProfilesForEntity,
  listPayrollRunsForEntity,
} from "@/lib/finance/read-queries";

export const metadata = { title: "Direct deposit — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let batches: Record<string, unknown>[] = [];
  let items: Record<string, unknown>[] = [];
  let payrollRuns: { id: string; run_number: string; run_status: string }[] = [];
  let payProfiles: { id: string; employee_number: string | null }[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      const [b, it, runs, profs] = await Promise.all([
        listDirectDepositBatchesForEntity(workspace.tenantId, workspace.entityId),
        listDirectDepositBatchItemsForEntity(workspace.tenantId, workspace.entityId),
        listPayrollRunsForEntity(workspace.tenantId, workspace.entityId),
        listEmployeePayProfilesForEntity(workspace.tenantId, workspace.entityId),
      ]);
      batches = b as Record<string, unknown>[];
      items = it as Record<string, unknown>[];
      payrollRuns = runs as typeof payrollRuns;
      payProfiles = profs as typeof payProfiles;
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load direct deposit data.";
    }
  }

  const batchOptions = batches.map((row) => ({
    id: String(row.id),
    batch_status: String(row.batch_status ?? ""),
    created_at: String(row.created_at ?? ""),
  }));

  return (
    <WorkflowPageFrame
      title="Direct deposit batches"
      moduleLine="Module: Tax / Payroll pay-out — Packs 014–015 (schema + permissions)"
      packNumber={15}
      workspaceName="Tax"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DirectDepositBatchForm workspace={workspace} payrollRuns={payrollRuns} />
            <DirectDepositBatchItemForm workspace={workspace} batches={batchOptions} payProfiles={payProfiles} />
          </div>
          <div className="mt-6 space-y-6">
            <div>
              <h2 className="text-sm font-medium text-neutral-300 mb-3">Batches</h2>
              <WorkflowDataTable
                columns={[
                  { key: "id", label: "Batch ID" },
                  { key: "payroll_run_id", label: "Payroll run" },
                  { key: "batch_status", label: "Status" },
                  { key: "created_at", label: "Created" },
                ]}
                rows={batches}
              />
            </div>
            <div>
              <h2 className="text-sm font-medium text-neutral-300 mb-3">Batch lines</h2>
              <WorkflowDataTable
                columns={[
                  { key: "direct_deposit_batch_id", label: "Batch" },
                  { key: "employee_pay_profile_id", label: "Pay profile" },
                  { key: "amount", label: "Amount" },
                  { key: "trace_reference", label: "Trace" },
                ]}
                rows={items}
              />
            </div>
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
