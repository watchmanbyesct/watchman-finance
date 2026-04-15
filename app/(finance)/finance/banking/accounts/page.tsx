/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { BankAccountCreateForm, BankAccountSeedButton } from "@/components/finance/connected/banking-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listBankAccountsForEntity } from "@/lib/finance/read-queries";

export const metadata = { title: "Bank accounts — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      rows = (await listBankAccountsForEntity(workspace.tenantId, workspace.entityId)) as Record<string, unknown>[];
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load bank accounts.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Bank accounts"
      moduleLine="Module: Banking — Pack 006"
      packNumber={6}
      workspaceName="Banking"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <BankAccountSeedButton workspace={workspace} />
          <BankAccountCreateForm workspace={workspace} />
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Accounts</h2>
            <WorkflowDataTable
              columns={[
                { key: "bank_name", label: "Bank" },
                { key: "account_name", label: "Account" },
                { key: "account_type", label: "Type" },
                { key: "currency_code", label: "CCY" },
                { key: "is_active", label: "Active" },
              ]}
              rows={rows}
            />
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
