/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { ImportBankTransactionForm, MatchBankTransactionForm } from "@/components/finance/connected/banking-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import {
  listBankAccountsForEntity,
  listBankTransactionsForEntity,
  listReconciliationsForEntity,
} from "@/lib/finance/read-queries";

export const metadata = { title: "Bank transactions — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let accounts: { id: string; account_name: string; bank_name: string }[] = [];
  let reconRows: Record<string, unknown>[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      const [tx, ac, rc] = await Promise.all([
        listBankTransactionsForEntity(workspace.tenantId, workspace.entityId),
        listBankAccountsForEntity(workspace.tenantId, workspace.entityId),
        listReconciliationsForEntity(workspace.tenantId, workspace.entityId),
      ]);
      rows = tx as Record<string, unknown>[];
      accounts = ac as typeof accounts;
      reconRows = rc as Record<string, unknown>[];
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load transactions.";
    }
  }

  const openRecons = (reconRows as { id: unknown; reconciliation_name: unknown; reconciliation_status: unknown }[])
    .filter((r) => ["draft", "in_review"].includes(String(r.reconciliation_status)))
    .map((r) => ({
      id: String(r.id),
      reconciliation_name: String(r.reconciliation_name),
      reconciliation_status: String(r.reconciliation_status),
    }));

  const unmatchedTx = (rows as { id: unknown; amount: unknown; description: unknown; transaction_date: unknown; match_status: unknown }[])
    .filter((t) => !["matched", "ignored"].includes(String(t.match_status)))
    .map((t) => ({
      id: String(t.id),
      amount: t.amount as string | number,
      description: String(t.description ?? ""),
      transaction_date: String(t.transaction_date ?? ""),
    }));

  return (
    <WorkflowPageFrame
      title="Bank transactions"
      moduleLine="Module: Banking — Pack 006"
      packNumber={6}
      workspaceName="Banking"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <ImportBankTransactionForm workspace={workspace} bankAccounts={accounts} />
          <MatchBankTransactionForm
            workspace={workspace}
            reconciliations={openRecons}
            transactions={unmatchedTx}
          />
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Recent transactions</h2>
            <WorkflowDataTable
              columns={[
                { key: "transaction_date", label: "Date" },
                { key: "transaction_type", label: "Type" },
                { key: "amount", label: "Amount" },
                { key: "match_status", label: "Match" },
                { key: "description", label: "Description" },
              ]}
              rows={rows}
            />
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
