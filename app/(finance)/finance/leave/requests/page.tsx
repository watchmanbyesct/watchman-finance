/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { LeaveRequestApproveForm, LeaveRequestSubmitForm } from "@/components/finance/connected/leave-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import {
  listFinancePeopleForTenant,
  listLeaveRequestsForEntity,
  listLeaveTypesForTenant,
} from "@/lib/finance/read-queries";

export const metadata = { title: "Leave requests — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let leaveTypes: { id: string; leave_code: string; leave_name: string }[] = [];
  let people: { id: string; legal_first_name: string; legal_last_name: string }[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      const [req, lt, ppl] = await Promise.all([
        listLeaveRequestsForEntity(workspace.tenantId, workspace.entityId),
        listLeaveTypesForTenant(workspace.tenantId),
        listFinancePeopleForTenant(workspace.tenantId),
      ]);
      rows = req as Record<string, unknown>[];
      leaveTypes = lt as typeof leaveTypes;
      people = ppl as typeof people;
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load leave requests.";
    }
  }

  const submittedRequests = (rows as { id: string; request_status: string; request_start_date: string }[]).filter(
    (r) => r.request_status === "submitted"
  );

  return (
    <WorkflowPageFrame
      title="Leave requests"
      moduleLine="Module: Leave & Accruals — Pack 005"
      packNumber={5}
      workspaceName="Leave & Accruals"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <LeaveRequestSubmitForm workspace={workspace} leaveTypes={leaveTypes} people={people} />
          <LeaveRequestApproveForm workspace={workspace} submittedRequests={submittedRequests} />
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Requests</h2>
            <WorkflowDataTable
              columns={[
                { key: "request_status", label: "Status" },
                { key: "request_start_date", label: "Start" },
                { key: "request_end_date", label: "End" },
                { key: "total_requested_hours", label: "Hours" },
              ]}
              rows={rows}
            />
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
