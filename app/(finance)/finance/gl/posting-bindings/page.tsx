/**
 * Copyright 2026 ESCT Holdings Inc.
 * Developed by Owens F. Shepard for ESCT Holdings Inc.
 */

import Link from "next/link";
import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { GlPostingBindingForm } from "@/components/finance/connected/gl-posting-bindings-form";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { GlWorkspaceBanner } from "@/components/finance/gl/gl-workspace-banner";
import { GlSetupRequired } from "@/components/finance/gl/gl-setup-required";
import { ModuleWorkspaceStatus } from "@/components/finance/module-workspace-status";
import {
  listEntityGlAccountBindings,
  listGlSubledgerPostingsForEntity,
} from "@/lib/finance/read-queries";
import { getAccountsByEntity } from "@/modules/finance-core/repositories/finance-core-repository";

export const metadata = { title: "GL posting bindings — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();

  if (!workspace) {
    return (
      <div className="max-w-5xl space-y-6">
        <div>
          <h1 className="wf-page-title">GL posting bindings</h1>
          <p className="text-sm text-neutral-500 mt-1">Module: General Ledger — Pack 018</p>
        </div>
        <ModuleWorkspaceStatus packNumber={18} workspaceName="General Ledger" />
        <GlSetupRequired />
      </div>
    );
  }

  let bindings: Awaited<ReturnType<typeof listEntityGlAccountBindings>> = [];
  let postings: Awaited<ReturnType<typeof listGlSubledgerPostingsForEntity>> = [];
  let accounts: Awaited<ReturnType<typeof getAccountsByEntity>> = [];
  let loadError: string | null = null;

  try {
    [bindings, postings, accounts] = await Promise.all([
      listEntityGlAccountBindings(workspace.tenantId, workspace.entityId),
      listGlSubledgerPostingsForEntity(workspace.tenantId, workspace.entityId),
      getAccountsByEntity(workspace.tenantId, workspace.entityId),
    ]);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Failed to load GL bindings.";
  }

  const accountById = new Map(accounts.map((a) => [a.id, a]));

  return (
    <WorkflowPageFrame
      title="GL posting bindings"
      moduleLine="Packs 017–018 — Map chart accounts to AR, AP, and payroll subledger automation; trace posted and reversal journals."
      packNumber={18}
      workspaceName="General Ledger"
      workspace={workspace}
      loadError={loadError}
      workflowConnected
    >
      <GlWorkspaceBanner workspace={workspace} />

      <p className="text-sm text-neutral-500">
        Journals created here appear in{" "}
        <Link href="/finance/journals" className="text-amber-500 hover:text-amber-400">
          Journal Entries
        </Link>{" "}
        with numbers such as <code className="text-neutral-400">AR-INV-…</code> or <code className="text-neutral-400">PR-…</code>.
      </p>

      <GlPostingBindingForm workspace={workspace} accounts={accounts} />

      <div>
        <h2 className="text-sm font-medium text-neutral-300 mb-3">Current bindings</h2>
        <WorkflowDataTable
          columns={[
            { key: "binding_key", label: "Binding" },
            {
              key: "account_id",
              label: "Account",
              render: (row) => {
                const id = String(row.account_id ?? "");
                const a = accountById.get(id);
                return a ? `${a.code} — ${a.name}` : id;
              },
            },
            { key: "updated_at", label: "Updated" },
          ]}
          rows={bindings as Record<string, unknown>[]}
          emptyMessage="No bindings saved yet."
        />
      </div>

      <div>
        <h2 className="text-sm font-medium text-neutral-300 mb-3 mt-8">Subledger → GL trace</h2>
        <WorkflowDataTable
          columns={[
            { key: "source_domain", label: "Domain" },
            { key: "source_event", label: "Event" },
            { key: "source_table", label: "Table" },
            {
              key: "journal_batch_id",
              label: "Journal",
              render: (row) => {
                const jid = String(row.journal_batch_id ?? "");
                return (
                  <Link href={`/finance/journals/${jid}`} className="text-amber-500 hover:text-amber-400 text-xs">
                    Open
                  </Link>
                );
              },
            },
            { key: "created_at", label: "Posted" },
          ]}
          rows={postings as Record<string, unknown>[]}
          emptyMessage="No automated postings yet."
        />
      </div>
    </WorkflowPageFrame>
  );
}
