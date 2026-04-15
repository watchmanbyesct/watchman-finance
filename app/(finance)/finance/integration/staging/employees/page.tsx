/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import {
  Pack002PromoteEmployeeForm,
  Pack002StageEmployeeForm,
} from "@/components/integration/pack002-workflow-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listStagedEmployeesForTenant } from "@/lib/integration/pack002-read-queries";

export const metadata = { title: "Staging — Employees — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      rows = (await listStagedEmployeesForTenant(workspace.tenantId)) as Record<string, unknown>[];
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load staged employees.";
    }
  }

  const stagedOptions = rows as { id: string; source_record_id: string; validation_status: string }[];

  return (
    <WorkflowPageFrame
      title="Staging — Employees"
      moduleLine="Pack 002 — Launch-shaped employee payloads in staged_employees; promote into finance_people."
      packNumber={2}
      workspaceName="Integration & staging"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <Pack002StageEmployeeForm workspace={workspace} />
          <Pack002PromoteEmployeeForm workspace={workspace} stagedRows={stagedOptions} />
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Queue</h2>
            <WorkflowDataTable
              columns={[
                { key: "source_record_id", label: "Source id" },
                { key: "validation_status", label: "Validation" },
                { key: "review_status", label: "Review" },
                { key: "received_at", label: "Received" },
                { key: "promoted_at", label: "Promoted" },
              ]}
              rows={rows}
            />
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
