/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import {
  AssignLeavePolicyForm,
  LeavePolicyCreateForm,
} from "@/components/finance/connected/leave-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import {
  listFinancePeopleForTenant,
  listLeavePoliciesForEntity,
  listLeaveTypesForTenant,
} from "@/lib/finance/read-queries";

export const metadata = { title: "Leave policies — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let policyOptions: { id: string; policy_code: string; policy_name: string }[] = [];
  let leaveTypes: { id: string; leave_code: string; leave_name: string }[] = [];
  let people: { id: string; legal_first_name: string; legal_last_name: string }[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      const [pol, lt, ppl] = await Promise.all([
        listLeavePoliciesForEntity(workspace.tenantId, workspace.entityId),
        listLeaveTypesForTenant(workspace.tenantId),
        listFinancePeopleForTenant(workspace.tenantId),
      ]);
      rows = pol as Record<string, unknown>[];
      policyOptions = pol as typeof policyOptions;
      leaveTypes = lt as typeof leaveTypes;
      people = ppl as typeof people;
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load leave policies.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Leave policies"
      moduleLine="Module: Leave & Accruals — Pack 005"
      packNumber={5}
      workspaceName="Leave & Accruals"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <LeavePolicyCreateForm workspace={workspace} leaveTypes={leaveTypes} />
          <AssignLeavePolicyForm workspace={workspace} policies={policyOptions} people={people} />
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Policies</h2>
            <WorkflowDataTable
              columns={[
                { key: "policy_code", label: "Code" },
                { key: "policy_name", label: "Name" },
                { key: "accrual_method", label: "Accrual" },
                { key: "status", label: "Status" },
              ]}
              rows={rows}
            />
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
