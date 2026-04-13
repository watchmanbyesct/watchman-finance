import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { BillingRuleForm } from "@/components/finance/connected/catalog-billing-inventory-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listBillingRulesForTenant } from "@/lib/finance/read-queries";

export const metadata = { title: "Billing rules — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      rows = (await listBillingRulesForTenant(workspace.tenantId)) as Record<string, unknown>[];
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load billing rules.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Billing rules"
      moduleLine="Module: Billing — Pack 007"
      packNumber={7}
      workspaceName="Billing"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <BillingRuleForm workspace={workspace} />
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Rules</h2>
            <WorkflowDataTable
              columns={[
                { key: "rule_code", label: "Code" },
                { key: "rule_name", label: "Name" },
                { key: "billing_trigger", label: "Trigger" },
                { key: "billing_frequency", label: "Frequency" },
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
