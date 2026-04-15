/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listPayStatementsForEntity } from "@/lib/finance/read-queries";

export const metadata = { title: "Pay statements — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      rows = (await listPayStatementsForEntity(workspace.tenantId, workspace.entityId)) as Record<string, unknown>[];
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load pay statements.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Pay statements"
      moduleLine="Module: Payroll — Pack 004"
      packNumber={4}
      workspaceName="Payroll"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <div>
          <p className="text-sm text-neutral-500 mb-4">
            Statements are generated when payroll runs are finalized. This list is read-only here.
          </p>
          <h2 className="text-sm font-medium text-neutral-300 mb-3">Statements</h2>
          <WorkflowDataTable
            columns={[
              { key: "statement_date", label: "Statement date" },
              { key: "statement_status", label: "Status" },
              { key: "gross_pay", label: "Gross" },
              { key: "net_pay", label: "Net" },
              { key: "finance_person_id", label: "Person id" },
            ]}
            rows={rows}
          />
        </div>
      )}
    </WorkflowPageFrame>
  );
}
