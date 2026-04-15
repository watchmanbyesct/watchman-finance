/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { TenantBootstrapRunForm } from "@/components/finance/connected/reporting-planning-consolidation-ops-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listTenantBootstrapRunsForTenant, listTenantProvisioningTemplates } from "@/lib/finance/read-queries";

export const metadata = { title: "Tenant bootstrap — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let templates: { id: string; template_code: string; template_name: string }[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      rows = (await listTenantBootstrapRunsForTenant(workspace.tenantId)) as Record<string, unknown>[];
      templates = (await listTenantProvisioningTemplates()) as typeof templates;
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load bootstrap runs.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Tenant bootstrap runs"
      moduleLine="Module: Commercial readiness — Pack 011"
      packNumber={11}
      workspaceName="Commercial readiness"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <div className="space-y-6">
          <TenantBootstrapRunForm workspace={workspace} templates={templates} />
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Runs</h2>
            <WorkflowDataTable
              columns={[
                { key: "bootstrap_status", label: "Status" },
                { key: "provisioning_template_id", label: "Template" },
                { key: "started_at", label: "Started" },
                { key: "completed_at", label: "Completed" },
              ]}
              rows={rows}
            />
          </div>
        </div>
      )}
    </WorkflowPageFrame>
  );
}
