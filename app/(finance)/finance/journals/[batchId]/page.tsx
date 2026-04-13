/**
 * Copyright 2026 ESCT Holdings Inc.
 * Developed by Owens F. Shepard for ESCT Holdings Inc.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { ModuleWorkspaceStatus } from "@/components/finance/module-workspace-status";
import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import {
  GlJournalAddLineForm,
  GlJournalDeleteLineButton,
  GlJournalPostBatchButton,
  GlJournalVoidForm,
} from "@/components/finance/connected/gl-journal-workflow-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { GlWorkspaceBanner } from "@/components/finance/gl/gl-workspace-banner";
import { GlSetupRequired } from "@/components/finance/gl/gl-setup-required";
import { getGlJournalBatchById, listGlJournalLinesForBatch } from "@/lib/finance/read-queries";
import { getAccountsByEntity } from "@/modules/finance-core/repositories/finance-core-repository";

export const metadata = { title: "Journal Detail — Watchman Finance" };

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

export default async function Page({ params }: { params: { batchId: string } }) {
  const workspace = await resolveFinanceWorkspace();

  if (!workspace) {
    return (
      <div className="max-w-5xl space-y-6">
        <div>
          <h1 className="wf-page-title">Journal detail</h1>
          <p className="text-sm text-neutral-500 mt-1">Module: General Ledger — Pack 016</p>
        </div>
        <ModuleWorkspaceStatus packNumber={16} workspaceName="General Ledger" />
        <GlSetupRequired />
      </div>
    );
  }

  let batch: Awaited<ReturnType<typeof getGlJournalBatchById>> = null;
  let lines: Awaited<ReturnType<typeof listGlJournalLinesForBatch>> = [];
  let accounts: Awaited<ReturnType<typeof getAccountsByEntity>> = [];
  let loadError: string | null = null;

  try {
    batch = await getGlJournalBatchById(workspace.tenantId, params.batchId);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Failed to load journal.";
  }

  if (!loadError) {
    if (!batch || batch.entity_id !== workspace.entityId) notFound();
    try {
      [lines, accounts] = await Promise.all([
        listGlJournalLinesForBatch(workspace.tenantId, params.batchId),
        getAccountsByEntity(workspace.tenantId, workspace.entityId),
      ]);
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load journal lines.";
    }
  }

  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const totalDebit = lines.reduce((s, l) => s + Number(l.debit_amount ?? 0), 0);
  const totalCredit = lines.reduce((s, l) => s + Number(l.credit_amount ?? 0), 0);
  const balanced =
    lines.length >= 2 &&
    totalDebit > 0 &&
    Number(totalDebit.toFixed(2)) === Number(totalCredit.toFixed(2));

  let postDisabled: string | null = null;
  if (batch && batch.batch_status !== "draft") {
    postDisabled = "This journal is not in draft status.";
  } else if (lines.length < 2) {
    postDisabled = "Add at least two lines before posting.";
  } else if (!balanced) {
    postDisabled = "Total debits must equal total credits (and be greater than zero).";
  }

  const title = batch ? `Journal ${batch.journal_number}` : "Journal detail";

  return (
    <WorkflowPageFrame
      title={title}
      moduleLine="Module: General Ledger — Pack 016 — journal batch and lines."
      packNumber={16}
      workspaceName="General Ledger"
      workspace={workspace}
      loadError={loadError}
      workflowConnected
    >
      <GlWorkspaceBanner workspace={workspace} />

      {batch && !loadError && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/finance/journals" className="text-xs text-amber-500 hover:text-amber-400">
              ← All journals
            </Link>
            <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
              <span>Date: {batch.journal_date}</span>
              <span className="text-neutral-700">|</span>
              <span className="capitalize">Status: {batch.batch_status}</span>
              {batch.posted_at && (
                <>
                  <span className="text-neutral-700">|</span>
                  <span>Posted {new Date(batch.posted_at).toLocaleString()}</span>
                </>
              )}
              {batch.void_reason && (
                <>
                  <span className="text-neutral-700">|</span>
                  <span className="text-red-300/90">Void reason: {batch.void_reason}</span>
                </>
              )}
            </div>
          </div>

          {batch.description && (
            <p className="text-sm text-neutral-400 border border-white/10 rounded-lg px-4 py-3 bg-white/[0.02]">
              {batch.description}
            </p>
          )}

          {batch.batch_status === "draft" && (
            <GlJournalAddLineForm workspace={workspace} journalBatchId={batch.id} accounts={accounts} />
          )}

          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Lines</h2>
            {!lines.length ? (
              <p className="text-sm text-neutral-500 py-6 text-center border border-dashed border-white/10 rounded-lg">
                No lines yet. Add at least one debit and one credit line before posting.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-white/10">
                <table className="w-full text-sm text-left">
                  <thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-neutral-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">#</th>
                      <th className="px-4 py-3 font-medium">Account</th>
                      <th className="px-4 py-3 font-medium">Memo</th>
                      <th className="px-4 py-3 font-medium text-right">Debit</th>
                      <th className="px-4 py-3 font-medium text-right">Credit</th>
                      {batch.batch_status === "draft" && <th className="px-4 py-3 font-medium w-24" />}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/8">
                    {lines.map((l) => {
                      const acct = accountById.get(l.account_id);
                      return (
                        <tr key={l.id} className="text-neutral-300 hover:bg-white/[0.02]">
                          <td className="px-4 py-2.5 text-neutral-500">{l.line_number}</td>
                          <td className="px-4 py-2.5">
                            {acct ? (
                              <span className="font-mono text-xs text-amber-500/90">{acct.code}</span>
                            ) : (
                              <span className="text-xs text-neutral-600">Unknown</span>
                            )}
                            <span className="text-neutral-500 ml-2">{acct?.name ?? ""}</span>
                          </td>
                          <td className="px-4 py-2.5 text-neutral-500 max-w-[200px] truncate">
                            {l.memo ?? "—"}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums">
                            {Number(l.debit_amount) > 0 ? money.format(Number(l.debit_amount)) : "—"}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums">
                            {Number(l.credit_amount) > 0 ? money.format(Number(l.credit_amount)) : "—"}
                          </td>
                          {batch.batch_status === "draft" && (
                            <td className="px-4 py-2.5 text-right">
                              <GlJournalDeleteLineButton workspace={workspace} journalLineId={l.id} />
                            </td>
                          )}
                        </tr>
                      );
                    })}
                    <tr className="bg-white/[0.03] text-neutral-200 font-medium">
                      <td colSpan={3} className="px-4 py-2.5 text-right text-xs uppercase tracking-wide text-neutral-500">
                        Totals
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{money.format(totalDebit)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{money.format(totalCredit)}</td>
                      {batch.batch_status === "draft" && <td />}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {batch.batch_status === "draft" && (
            <GlJournalPostBatchButton
              workspace={workspace}
              journalBatchId={batch.id}
              disabledReason={postDisabled}
            />
          )}

          {batch.batch_status === "posted" && <GlJournalVoidForm workspace={workspace} journalBatchId={batch.id} />}
        </>
      )}
    </WorkflowPageFrame>
  );
}
