/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { FinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import type { Account } from "@/types";
import type { FiscalPeriod } from "@/types";
import {
  addGlJournalLine,
  createGlJournalBatch,
  deleteGlJournalLine,
  postGlJournalBatch,
  voidGlJournalBatch,
} from "@/modules/finance-core/actions/finance-core-actions";

const input =
  "rounded-md border border-white/10 bg-white/5 px-3 py-2 text-neutral-200 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/40";

export function GlJournalCreateBatchForm({
  workspace,
  fiscalPeriods,
  defaultJournalDate,
}: {
  workspace: FinanceWorkspace;
  fiscalPeriods: FiscalPeriod[];
  defaultJournalDate: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">New journal batch</h2>
      <p className="text-xs text-neutral-500 leading-relaxed">
        Draft batches can hold lines until you post. Journal numbers must be unique per entity.
      </p>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const fp = String(fd.get("fiscalPeriodId") ?? "").trim();
            const res = await createGlJournalBatch({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              journalNumber: String(fd.get("journalNumber") ?? "").trim(),
              journalDate: String(fd.get("journalDate") ?? "").trim(),
              description: String(fd.get("description") ?? "").trim() || undefined,
              fiscalPeriodId: fp || undefined,
            });
            setMsg(res.message);
            if (res.success && res.data?.journalBatchId) {
              (e.target as HTMLFormElement).reset();
              router.push(`/finance/journals/${res.data.journalBatchId}`);
            }
          });
        }}
      >
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Journal number</span>
          <input name="journalNumber" required className={input} placeholder="JE-2026-0001" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Journal date</span>
          <input
            name="journalDate"
            type="date"
            required
            defaultValue={defaultJournalDate}
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Fiscal period (optional)</span>
          <select name="fiscalPeriodId" className={input}>
            <option value="">None</option>
            {fiscalPeriods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.periodName} ({p.startDate} – {p.endDate}) — {p.status}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Description</span>
          <input name="description" className={input} placeholder="Month-end accrual…" />
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black"
          >
            {pending ? "Creating…" : "Create draft batch"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function GlJournalAddLineForm({
  workspace,
  journalBatchId,
  accounts,
}: {
  workspace: FinanceWorkspace;
  journalBatchId: string;
  accounts: Account[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const postable = accounts.filter((a) => a.allowPosting && a.isActive);

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Add line</h2>
      {postable.length === 0 ? (
        <p className="text-xs text-neutral-500">
          No postable active accounts for this entity.{" "}
          <Link href="/finance/accounts" className="text-amber-500 hover:text-amber-400">
            Chart of Accounts
          </Link>
        </p>
      ) : (
        <>
          {msg && <p className="text-xs text-amber-400">{msg}</p>}
          <form
            className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              start(async () => {
                setMsg(null);
                const debit = Number(String(fd.get("debitAmount") ?? "").trim() || "0");
                const credit = Number(String(fd.get("creditAmount") ?? "").trim() || "0");
                const res = await addGlJournalLine({
                  tenantId: workspace.tenantId,
                  journalBatchId,
                  accountId: String(fd.get("accountId") ?? ""),
                  memo: String(fd.get("memo") ?? "").trim() || undefined,
                  debitAmount: debit,
                  creditAmount: credit,
                });
                setMsg(res.message);
                if (res.success) {
                  (e.target as HTMLFormElement).reset();
                  router.refresh();
                }
              });
            }}
          >
            <label className="flex flex-col gap-1 md:col-span-2">
              <span className="text-neutral-500 text-xs">Account</span>
              <select name="accountId" required className={input}>
                <option value="">Select…</option>
                {postable.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} — {a.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-neutral-500 text-xs">Debit</span>
              <input name="debitAmount" type="number" min={0} step="0.01" className={input} placeholder="0.00" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-neutral-500 text-xs">Credit</span>
              <input name="creditAmount" type="number" min={0} step="0.01" className={input} placeholder="0.00" />
            </label>
            <label className="flex flex-col gap-1 md:col-span-2">
              <span className="text-neutral-500 text-xs">Memo</span>
              <input name="memo" className={input} />
            </label>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black"
              >
                {pending ? "Adding…" : "Add line"}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

export function GlJournalDeleteLineButton({
  workspace,
  journalLineId,
}: {
  workspace: FinanceWorkspace;
  journalLineId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      {msg && <span className="text-[10px] text-amber-400">{msg}</span>}
      <button
        type="button"
        disabled={pending}
        className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
        onClick={() => {
          if (!confirm("Remove this line from the draft journal?")) return;
          start(async () => {
            setMsg(null);
            const res = await deleteGlJournalLine({
              tenantId: workspace.tenantId,
              journalLineId,
            });
            setMsg(res.message);
            if (res.success) router.refresh();
          });
        }}
      >
        {pending ? "…" : "Remove"}
      </button>
    </div>
  );
}

export function GlJournalPostBatchButton({
  workspace,
  journalBatchId,
  disabledReason,
}: {
  workspace: FinanceWorkspace;
  journalBatchId: string;
  disabledReason?: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="wf-card space-y-2">
      <h2 className="text-sm font-medium text-neutral-200">Post journal</h2>
      {disabledReason ? (
        <p className="text-xs text-neutral-500">{disabledReason}</p>
      ) : (
        <p className="text-xs text-neutral-500">
          Posting requires at least two lines, debits equal to credits, and a positive total. If a fiscal period is set,
          it must be open and the journal date must fall within that period.
        </p>
      )}
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <button
        type="button"
        disabled={pending || !!disabledReason}
        className="rounded-md bg-emerald-700/90 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        onClick={() => {
          start(async () => {
            setMsg(null);
            const res = await postGlJournalBatch({
              tenantId: workspace.tenantId,
              journalBatchId,
            });
            setMsg(res.message);
            if (res.success) router.refresh();
          });
        }}
      >
        {pending ? "Posting…" : "Post journal"}
      </button>
    </div>
  );
}

export function GlJournalVoidForm({
  workspace,
  journalBatchId,
}: {
  workspace: FinanceWorkspace;
  journalBatchId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Void posted journal</h2>
      <p className="text-xs text-neutral-500">
        Void marks the batch as reversed for audit; lines are retained for history. Enter a reason visible in the
        batch header.
      </p>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="space-y-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await voidGlJournalBatch({
              tenantId: workspace.tenantId,
              journalBatchId,
              voidReason: String(fd.get("voidReason") ?? "").trim(),
            });
            setMsg(res.message);
            if (res.success) {
              (e.target as HTMLFormElement).reset();
              router.refresh();
            }
          });
        }}
      >
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Reason</span>
          <textarea name="voidReason" required rows={3} className={input} placeholder="Correction / duplicate…" />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border border-red-500/40 bg-red-950/30 px-4 py-2 text-sm font-medium text-red-200 hover:bg-red-950/50"
        >
          {pending ? "Voiding…" : "Void journal"}
        </button>
      </form>
    </div>
  );
}
