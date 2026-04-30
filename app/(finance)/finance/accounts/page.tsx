/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import { ModuleWorkspaceStatus } from "@/components/finance/module-workspace-status";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { getAccountsByEntity, getAccountCategories } from "@/modules/finance-core/repositories/finance-core-repository";
import { GlWorkspaceBanner } from "@/components/finance/gl/gl-workspace-banner";
import { GlSetupRequired } from "@/components/finance/gl/gl-setup-required";
import { AccountCreateForm } from "@/components/finance/gl/account-create-form";
import {
  CreateAccountCategoryForm,
  IntegrationAccountCategorySeedButton,
} from "@/components/finance/gl/account-category-forms";
import { AccountsTable } from "@/components/finance/gl/accounts-table";
import { AccountSeedButton } from "@/components/finance/gl/account-seed-button";

function fmtTaxonomy(value: string | null | undefined): string {
  if (!value) return "—";
  return value.replaceAll("_", " ");
}

export const metadata = { title: "Chart of Accounts — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();

  if (!workspace) {
    return (
      <div className="max-w-5xl space-y-6">
        <div>
          <h1 className="wf-page-title">Chart of Accounts</h1>
          <p className="text-sm text-neutral-500 mt-1">Module: General Ledger &mdash; Pack 001</p>
        </div>
        <ModuleWorkspaceStatus packNumber={1} workspaceName="General Ledger" />
        <GlSetupRequired />
      </div>
    );
  }

  let accounts: Awaited<ReturnType<typeof getAccountsByEntity>> = [];
  let categories: Awaited<ReturnType<typeof getAccountCategories>> = [];
  let loadError: string | null = null;

  try {
    [accounts, categories] = await Promise.all([
      getAccountsByEntity(workspace.tenantId, workspace.entityId),
      getAccountCategories(workspace.tenantId),
    ]);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Failed to load chart of accounts.";
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="wf-page-title">Chart of Accounts</h1>
        <p className="text-sm text-neutral-500 mt-1">Module: General Ledger &mdash; Pack 001</p>
      </div>

      <ModuleWorkspaceStatus packNumber={1} workspaceName="General Ledger" workflowConnected />

      <GlWorkspaceBanner workspace={workspace} />

      {loadError ? (
        <div className="rounded-lg border border-red-500/30 bg-red-950/25 px-4 py-3 text-sm text-red-200">
          {loadError}
        </div>
      ) : (
        <>
          <AccountSeedButton tenantId={workspace.tenantId} entityId={workspace.entityId} />
          <IntegrationAccountCategorySeedButton workspace={workspace} />
          <CreateAccountCategoryForm workspace={workspace} />
          <AccountCreateForm workspace={workspace} categories={categories} />

          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Account categories</h2>
            {!categories.length ? (
              <p className="text-sm text-neutral-500 py-4">No active categories found. Use "Seed integration categories" above.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-white/10 mb-6">
                <table className="w-full text-sm text-left">
                  <thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-neutral-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Code</th>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Normal</th>
                      <th className="px-4 py-3 font-medium">Integration taxonomy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/8 text-neutral-300">
                    {categories.map((c) => (
                      <tr key={c.id}>
                        <td className="px-4 py-2.5 font-mono text-xs text-amber-500/90">{c.code}</td>
                        <td className="px-4 py-2.5">{c.name}</td>
                        <td className="px-4 py-2.5">{c.category_type}</td>
                        <td className="px-4 py-2.5">{c.normal_balance}</td>
                        <td className="px-4 py-2.5 text-xs text-neutral-400">{fmtTaxonomy(c.integration_account_type)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Accounts</h2>
            <AccountsTable accounts={accounts} workspace={workspace} />
          </div>
        </>
      )}
    </div>
  );
}
