import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { IntercompanyTransactionForm } from "@/components/finance/connected/reporting-planning-consolidation-ops-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listEntitiesForTenant, listIntercompanyTransactionsForEntity } from "@/lib/finance/read-queries";

export const metadata = { title: "Intercompany transactions — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let entities: { id: string; code: string; display_name: string }[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      rows = (await listIntercompanyTransactionsForEntity(workspace.tenantId, workspace.entityId)) as Record<
        string,
        unknown
      >[];
      entities = (await listEntitiesForTenant(workspace.tenantId)) as typeof entities;
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load intercompany transactions.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Intercompany transactions"
      moduleLine="Module: Consolidation — Pack 011"
      packNumber={11}
      workspaceName="Consolidation"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <div className="space-y-6">
          <IntercompanyTransactionForm workspace={workspace} entities={entities} />
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Drafts & flows from {workspace.entityCode}</h2>
            <WorkflowDataTable
              columns={[
                { key: "transaction_code", label: "Code" },
                { key: "transaction_type", label: "Type" },
                { key: "transaction_status", label: "Status" },
                { key: "amount", label: "Amount" },
                { key: "counterparty_entity_id", label: "Counterparty" },
              ]}
              rows={rows}
            />
          </div>
        </div>
      )}
    </WorkflowPageFrame>
  );
}
