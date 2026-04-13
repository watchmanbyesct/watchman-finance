/**
 * Copyright 2026 ESCT Holdings Inc.
 * Developed by Owens F. Shepard for ESCT Holdings Inc.
 */

import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { ProvisioningTemplateForm } from "@/components/finance/connected/reporting-planning-consolidation-ops-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listTenantProvisioningTemplates } from "@/lib/finance/read-queries";

export const metadata = { title: "Provisioning templates — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      rows = (await listTenantProvisioningTemplates()) as Record<string, unknown>[];
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load provisioning templates.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Provisioning templates"
      moduleLine="Module: Commercial readiness — Pack 011 (list + create template; consolidation.group.manage)"
      packNumber={11}
      workspaceName="Commercial readiness"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <ProvisioningTemplateForm workspace={workspace} />
          <div className="mt-6">
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Templates</h2>
            <WorkflowDataTable
              columns={[
                { key: "template_code", label: "Code" },
                { key: "template_name", label: "Name" },
                { key: "template_status", label: "Status" },
                { key: "created_at", label: "Created" },
              ]}
              rows={rows}
            />
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
