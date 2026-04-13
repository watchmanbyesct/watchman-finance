import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { ApproveTransferRequestForm, TransferRequestForm } from "@/components/finance/connected/banking-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listBankAccountsForEntity, listTransferRequestsForEntity } from "@/lib/finance/read-queries";

export const metadata = { title: "Transfers — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let accounts: { id: string; account_name: string; bank_name: string }[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      const [t, a] = await Promise.all([
        listTransferRequestsForEntity(workspace.tenantId, workspace.entityId),
        listBankAccountsForEntity(workspace.tenantId, workspace.entityId),
      ]);
      rows = t as Record<string, unknown>[];
      accounts = a as typeof accounts;
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load transfers.";
    }
  }

  const submittedTransfers = (rows as { id: string; transfer_status: string; requested_amount: string | number }[]).filter(
    (t) => t.transfer_status === "submitted"
  );

  return (
    <WorkflowPageFrame
      title="Transfer requests"
      moduleLine="Module: Banking — Pack 006"
      packNumber={6}
      workspaceName="Banking"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <TransferRequestForm workspace={workspace} bankAccounts={accounts} />
          <ApproveTransferRequestForm workspace={workspace} submittedTransfers={submittedTransfers} />
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Requests</h2>
            <WorkflowDataTable
              columns={[
                { key: "transfer_status", label: "Status" },
                { key: "requested_amount", label: "Amount" },
                { key: "transfer_date", label: "Transfer date" },
                { key: "from_bank_account_id", label: "From acct id" },
                { key: "to_bank_account_id", label: "To acct id" },
              ]}
              rows={rows}
            />
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
