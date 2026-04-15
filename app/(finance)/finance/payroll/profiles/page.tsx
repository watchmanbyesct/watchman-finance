/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { EmployeePayProfileForm, EmployeePayProfileSeedButton } from "@/components/finance/connected/payroll-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import {
  listEmployeePayProfilesForEntity,
  listFinancePeopleForTenant,
  listPayGroupsForEntity,
} from "@/lib/finance/read-queries";

export const metadata = { title: "Pay profiles — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let people: { id: string; legal_first_name: string; legal_last_name: string }[] = [];
  let groups: { id: string; group_code: string; group_name: string }[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      const [prof, ppl, grp] = await Promise.all([
        listEmployeePayProfilesForEntity(workspace.tenantId, workspace.entityId),
        listFinancePeopleForTenant(workspace.tenantId),
        listPayGroupsForEntity(workspace.tenantId, workspace.entityId),
      ]);
      rows = prof as Record<string, unknown>[];
      people = ppl as typeof people;
      groups = grp as typeof groups;
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load pay profiles.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Employee pay profiles"
      moduleLine="Module: Payroll — Pack 004"
      packNumber={4}
      workspaceName="Payroll"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <EmployeePayProfileSeedButton workspace={workspace} peopleCount={people.length} />
          <EmployeePayProfileForm workspace={workspace} people={people} payGroups={groups} />
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Profiles</h2>
            <WorkflowDataTable
              columns={[
                { key: "employee_number", label: "Employee #" },
                { key: "pay_type", label: "Pay type" },
                { key: "base_rate", label: "Base rate" },
                { key: "annual_salary", label: "Annual" },
                { key: "finance_person_id", label: "Person id" },
              ]}
              rows={rows}
            />
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
