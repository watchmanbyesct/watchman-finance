/**
 * Copyright 2026 ESCT Holdings Inc.
 * Developed by Owens F. Shepard for ESCT Holdings Inc.
 */

import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { EmployeeItemIssueForm } from "@/components/finance/connected/catalog-billing-inventory-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import {
  listEmployeeItemIssuesForTenant,
  listFinancePeopleForTenant,
  listInventoryItemsForTenant,
} from "@/lib/finance/read-queries";

export const metadata = { title: "Item issues — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let items: { id: string; item_code: string; item_name: string }[] = [];
  let people: { id: string; legal_first_name: string; legal_last_name: string }[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      const [iss, it, ppl] = await Promise.all([
        listEmployeeItemIssuesForTenant(workspace.tenantId),
        listInventoryItemsForTenant(workspace.tenantId),
        listFinancePeopleForTenant(workspace.tenantId),
      ]);
      rows = iss as Record<string, unknown>[];
      items = it as typeof items;
      people = ppl as typeof people;
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load issues.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Employee item issues"
      moduleLine="Module: Inventory & Assets — Pack 008"
      packNumber={8}
      workspaceName="Inventory & Assets"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <div className="space-y-6">
          <EmployeeItemIssueForm workspace={workspace} items={items} people={people} />
          <WorkflowDataTable
          columns={[
            { key: "issue_status", label: "Status" },
            { key: "issue_date", label: "Issue date" },
            { key: "issue_quantity", label: "Qty" },
            { key: "inventory_item_id", label: "Item id" },
            { key: "finance_person_id", label: "Person id" },
          ]}
          rows={rows}
        />
        </div>
      )}
    </WorkflowPageFrame>
  );
}
