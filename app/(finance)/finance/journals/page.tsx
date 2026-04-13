import Link from "next/link";
import { ModuleWorkspaceStatus } from "@/components/finance/module-workspace-status";
import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { GlJournalCreateBatchForm } from "@/components/finance/connected/gl-journal-workflow-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { GlWorkspaceBanner } from "@/components/finance/gl/gl-workspace-banner";
import { GlSetupRequired } from "@/components/finance/gl/gl-setup-required";
import { listGlJournalBatchesForEntity } from "@/lib/finance/read-queries";
import { getFiscalPeriodsByEntity } from "@/modules/finance-core/repositories/finance-core-repository";

export const metadata = { title: "Journal Entries — Watchman Finance" };

function statusBadge(status: string) {
  if (status === "posted") {
    return <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/50 text-emerald-400">Posted</span>;
  }
  if (status === "void") {
    return <span className="text-[10px] px-2 py-0.5 rounded bg-red-950/40 text-red-300">Void</span>;
  }
  return <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/40 text-amber-400">Draft</span>;
}

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  const defaultJournalDate = new Date().toISOString().slice(0, 10);

  if (!workspace) {
    return (
      <div className="max-w-5xl space-y-6">
        <div>
          <h1 className="wf-page-title">Journal Entries</h1>
          <p className="text-sm text-neutral-500 mt-1">Module: General Ledger — Pack 016</p>
        </div>
        <ModuleWorkspaceStatus packNumber={16} workspaceName="General Ledger" />
        <GlSetupRequired />
      </div>
    );
  }

  let batches: Awaited<ReturnType<typeof listGlJournalBatchesForEntity>> = [];
  let fiscalPeriods: Awaited<ReturnType<typeof getFiscalPeriodsByEntity>> = [];
  let loadError: string | null = null;

  try {
    [batches, fiscalPeriods] = await Promise.all([
      listGlJournalBatchesForEntity(workspace.tenantId, workspace.entityId),
      getFiscalPeriodsByEntity(workspace.tenantId, workspace.entityId),
    ]);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Failed to load journal batches.";
  }

  return (
    <WorkflowPageFrame
      title="Journal Entries"
      moduleLine="Module: General Ledger — Pack 016 (manual GL journal batches and lines)."
      packNumber={16}
      workspaceName="General Ledger"
      workspace={workspace}
      loadError={loadError}
      workflowConnected
    >
      <GlWorkspaceBanner workspace={workspace} />

      <GlJournalCreateBatchForm
        workspace={workspace}
        fiscalPeriods={fiscalPeriods}
        defaultJournalDate={defaultJournalDate}
      />

      <div>
        <h2 className="text-sm font-medium text-neutral-300 mb-3">Journal batches</h2>
        {!batches.length ? (
          <p className="text-sm text-neutral-500 py-8 text-center border border-dashed border-white/10 rounded-lg">
            No journal batches yet. Create a draft above, add debit and credit lines, then post when balanced.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-sm text-left">
              <thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Number</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium w-28" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/8">
                {batches.map((b) => (
                  <tr key={b.id} className="text-neutral-300 hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 font-mono text-xs text-amber-500/90">{b.journal_number}</td>
                    <td className="px-4 py-2.5 text-neutral-400">{b.journal_date}</td>
                    <td className="px-4 py-2.5">{statusBadge(b.batch_status)}</td>
                    <td className="px-4 py-2.5 text-neutral-500 max-w-xs truncate">{b.description ?? "—"}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Link
                        href={`/finance/journals/${b.id}`}
                        className="text-xs text-amber-500 hover:text-amber-400"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-neutral-600">
        Operational sub-ledgers (AR, AP, banking) continue to post through their own workflows; this screen is for
        manual GL journals after Pack 016 is applied.
      </p>
    </WorkflowPageFrame>
  );
}
