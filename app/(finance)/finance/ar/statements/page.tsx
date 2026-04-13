import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { ArStatementRunForm } from "@/components/finance/connected/ar-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listArStatementRunsForEntity, listCustomersForEntityScope } from "@/lib/finance/read-queries";

export const metadata = { title: "AR statement runs — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let customers: { id: string; customer_code: string; display_name: string }[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      const [runs, cust] = await Promise.all([
        listArStatementRunsForEntity(workspace.tenantId, workspace.entityId),
        listCustomersForEntityScope(workspace.tenantId, workspace.entityId),
      ]);
      rows = runs as Record<string, unknown>[];
      customers = cust as typeof customers;
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load statement runs.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Customer statement runs"
      moduleLine="Module: Accounts Receivable — Packs 014–015 (schema + permissions)"
      packNumber={15}
      workspaceName="Accounts Receivable"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <ArStatementRunForm workspace={workspace} customers={customers} />
          <div className="mt-6">
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Runs</h2>
            <WorkflowDataTable
              columns={[
                { key: "customer_id", label: "Customer" },
                { key: "statement_through_date", label: "Through" },
                { key: "output_format", label: "Format" },
                { key: "run_status", label: "Status" },
              ]}
              rows={rows}
            />
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
