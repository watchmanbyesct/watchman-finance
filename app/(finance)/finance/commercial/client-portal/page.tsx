/**
 * Copyright 2026 ESCT Holdings Inc.
 * Developed by Owens F. Shepard for ESCT Holdings Inc.
 */

import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { ClientPortalProfileForm } from "@/components/finance/connected/reporting-planning-consolidation-ops-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listClientPortalProfilesForTenant, listCustomersForTenant } from "@/lib/finance/read-queries";

export const metadata = { title: "Client portal — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let customers: { id: string; customer_code: string; display_name: string }[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      rows = (await listClientPortalProfilesForTenant(workspace.tenantId)) as Record<string, unknown>[];
      customers = (await listCustomersForTenant(workspace.tenantId)) as typeof customers;
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load client portal profiles.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Client portal profiles"
      moduleLine="Module: Commercial readiness — Pack 011"
      packNumber={11}
      workspaceName="Commercial readiness"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <div className="space-y-6">
          <ClientPortalProfileForm workspace={workspace} customers={customers} />
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Profiles</h2>
            <WorkflowDataTable
              columns={[
                { key: "customer_id", label: "Customer" },
                { key: "portal_status", label: "Portal" },
                { key: "allow_payment_submission", label: "Pay submit" },
                { key: "created_at", label: "Created" },
              ]}
              rows={rows}
            />
          </div>
        </div>
      )}
    </WorkflowPageFrame>
  );
}
