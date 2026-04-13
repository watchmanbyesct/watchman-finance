/**
 * Copyright 2026 ESCT Holdings Inc.
 * Developed by Owens F. Shepard for ESCT Holdings Inc.
 */

import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { TaxComplianceTaskForm } from "@/components/finance/connected/tax-workflow-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listTaxComplianceTasksForEntity } from "@/lib/finance/read-queries";

export const metadata = { title: "Tax compliance tasks — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      rows = (await listTaxComplianceTasksForEntity(workspace.tenantId, workspace.entityId)) as Record<
        string,
        unknown
      >[];
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load compliance tasks.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Tax compliance tasks"
      moduleLine="Module: Tax — Packs 014–015 (schema + permissions)"
      packNumber={15}
      workspaceName="Tax"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <TaxComplianceTaskForm workspace={workspace} />
          <div className="mt-6">
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Tasks</h2>
            <WorkflowDataTable
              columns={[
                { key: "task_code", label: "Code" },
                { key: "task_name", label: "Name" },
                { key: "task_status", label: "Status" },
                { key: "due_date", label: "Due" },
              ]}
              rows={rows}
            />
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
