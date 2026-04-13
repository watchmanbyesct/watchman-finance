import { ModuleWorkspaceStatus } from "@/components/finance/module-workspace-status";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { getAccountsByEntity, getAccountCategories } from "@/modules/finance-core/repositories/finance-core-repository";
import { GlWorkspaceBanner } from "@/components/finance/gl/gl-workspace-banner";
import { GlSetupRequired } from "@/components/finance/gl/gl-setup-required";
import { AccountCreateForm } from "@/components/finance/gl/account-create-form";
import { AccountsTable } from "@/components/finance/gl/accounts-table";

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
          <AccountCreateForm
            workspace={workspace}
            categories={categories as { id: string; code: string; name: string }[]}
          />

          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Accounts</h2>
            <AccountsTable accounts={accounts} workspace={workspace} />
          </div>
        </>
      )}
    </div>
  );
}
