import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { ReconciliationCreateForm, ReconciliationLifecycleForm } from "@/components/finance/connected/banking-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listBankAccountsForEntity, listReconciliationsForEntity } from "@/lib/finance/read-queries";

export const metadata = { title: "Reconciliations — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let accounts: { id: string; account_name: string; bank_name: string }[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      const [r, a] = await Promise.all([
        listReconciliationsForEntity(workspace.tenantId, workspace.entityId),
        listBankAccountsForEntity(workspace.tenantId, workspace.entityId),
      ]);
      rows = r as Record<string, unknown>[];
      accounts = a as typeof accounts;
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load reconciliations.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Reconciliations"
      moduleLine="Module: Banking — Pack 006"
      packNumber={6}
      workspaceName="Banking"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <ReconciliationCreateForm workspace={workspace} bankAccounts={accounts} />
          <ReconciliationLifecycleForm
            workspace={workspace}
            reconciliations={rows.map((r) => ({
              id: String(r.id),
              reconciliation_name: String(r.reconciliation_name),
              reconciliation_status: String(r.reconciliation_status),
            }))}
          />
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Reconciliation sessions</h2>
            <WorkflowDataTable
              columns={[
                { key: "reconciliation_name", label: "Name" },
                { key: "reconciliation_status", label: "Status" },
                { key: "statement_start_date", label: "Start" },
                { key: "statement_end_date", label: "End" },
                { key: "statement_ending_balance", label: "Stmt balance" },
              ]}
              rows={rows}
            />
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
