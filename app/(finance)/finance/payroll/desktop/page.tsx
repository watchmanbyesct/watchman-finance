/**
 * Copyright 2026 ESCT Holdings Inc.
 * Developed by Owens F. Shepard for ESCT Holdings Inc.
 */

import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import {
  PayrollDesktopApplyComponentsForm,
  PayrollDesktopCatalogForm,
  PayrollItemAssignmentForm,
} from "@/components/finance/connected/payroll-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import {
  listEmployeePayItemAssignmentsForEntity,
  listEmployeePayProfilesForEntity,
  listPayrollItemCatalogForEntity,
  listPayrollRunsForEntity,
  listPayrollTaxLiabilitiesForEntity,
} from "@/lib/finance/read-queries";

export const metadata = { title: "Payroll Desktop Components — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let items: Record<string, unknown>[] = [];
  let assignments: Record<string, unknown>[] = [];
  let liabilities: Record<string, unknown>[] = [];
  let runs: { id: string; run_number: string; run_status: string }[] = [];
  let profiles: { id: string; employee_number: string | null; finance_person_id: string }[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      const [it, asn, liab, pr, runRows] = await Promise.all([
        listPayrollItemCatalogForEntity(workspace.tenantId, workspace.entityId),
        listEmployeePayItemAssignmentsForEntity(workspace.tenantId, workspace.entityId),
        listPayrollTaxLiabilitiesForEntity(workspace.tenantId, workspace.entityId),
        listEmployeePayProfilesForEntity(workspace.tenantId, workspace.entityId),
        listPayrollRunsForEntity(workspace.tenantId, workspace.entityId),
      ]);
      items = it as Record<string, unknown>[];
      assignments = asn as Record<string, unknown>[];
      liabilities = liab as Record<string, unknown>[];
      profiles = (pr as Array<{ id: string; employee_number: string | null; finance_person_id: string }>) ?? [];
      runs =
        (runRows as Array<{ id: string; run_number: string; run_status: string }>).map((r) => ({
          id: String(r.id),
          run_number: String(r.run_number),
          run_status: String(r.run_status),
        })) ?? [];
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load desktop payroll components.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Payroll desktop components"
      moduleLine="Pack 026 — Desktop-style payroll items, assignment mapping, run componentization, and liability tracking."
      packNumber={26}
      workspaceName="Payroll Desktop Components"
      workspace={workspace}
      loadError={loadError}
      workflowConnected
    >
      {workspace && !loadError && (
        <>
          <PayrollDesktopCatalogForm workspace={workspace} />
          <PayrollItemAssignmentForm
            workspace={workspace}
            profiles={profiles}
            items={items.map((r) => ({
              id: String(r.id),
              item_code: String(r.item_code),
              item_name: String(r.item_name),
            }))}
          />
          <PayrollDesktopApplyComponentsForm workspace={workspace} runs={runs} />
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Payroll item catalog</h2>
            <WorkflowDataTable
              columns={[
                { key: "item_code", label: "Code" },
                { key: "item_name", label: "Name" },
                { key: "item_type", label: "Type" },
                { key: "calculation_method", label: "Calc" },
                { key: "default_percent", label: "Percent" },
                { key: "default_amount", label: "Amount" },
                { key: "agency_name", label: "Agency" },
              ]}
              rows={items}
            />
          </div>
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Employee item assignments</h2>
            <WorkflowDataTable
              columns={[
                { key: "employee_pay_profile_id", label: "Profile" },
                { key: "payroll_item_id", label: "Item" },
                { key: "assignment_status", label: "Status" },
                { key: "override_percent", label: "Pct override" },
                { key: "override_amount", label: "Amount override" },
              ]}
              rows={assignments}
            />
          </div>
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Payroll liabilities</h2>
            <WorkflowDataTable
              columns={[
                { key: "created_at", label: "Created" },
                { key: "agency_name", label: "Agency" },
                { key: "liability_type", label: "Type" },
                { key: "amount", label: "Amount" },
                { key: "liability_status", label: "Status" },
                { key: "payroll_run_id", label: "Run" },
              ]}
              rows={liabilities}
            />
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
