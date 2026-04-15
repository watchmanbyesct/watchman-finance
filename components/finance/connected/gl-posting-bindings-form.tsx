/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { FinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import type { Account } from "@/types";
import { upsertEntityGlAccountBinding } from "@/modules/finance-core/actions/finance-core-actions";

const input =
  "rounded-md border border-white/10 bg-white/5 px-3 py-2 text-neutral-200 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/40";

const BINDING_OPTIONS = [
  { value: "ar_receivable", label: "AR — Trade receivable (debit on invoice issue)" },
  { value: "ar_revenue", label: "AR — Revenue / sales (credit on invoice issue)" },
  { value: "ar_cash_clearing", label: "AR — Cash / clearing (debit on payment)" },
  { value: "payroll_expense", label: "Payroll — Wage expense (debit on finalize)" },
  { value: "payroll_liability", label: "Payroll — Wages payable (credit on finalize)" },
  { value: "ap_expense", label: "AP — Expense / GRNI (debit when bill approved)" },
  { value: "ap_payable", label: "AP — Trade payable (credit when bill approved)" },
  { value: "ap_cash_clearing", label: "AP — Cash / clearing (credit when vendor pays bill)" },
] as const;

export function GlPostingBindingForm({
  workspace,
  accounts,
}: {
  workspace: FinanceWorkspace;
  accounts: Account[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const postable = accounts.filter((a) => a.allowPosting && a.isActive);

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Map accounts for automated GL</h2>
      <p className="text-xs text-neutral-500 leading-relaxed">
        When bindings are set, issuing AR invoices, applying AR payments, approving AP bills, recording AP payments to a
        bill, and finalizing payroll runs create balanced posted journals (Packs 017–018). AR invoice void and payroll
        reversal post reversing journals from the original GL lines. Requires chart accounts that allow posting.
      </p>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await upsertEntityGlAccountBinding({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              bindingKey: String(fd.get("bindingKey") ?? "") as (typeof BINDING_OPTIONS)[number]["value"],
              accountId: String(fd.get("accountId") ?? ""),
            });
            setMsg(res.message);
            if (res.success) router.refresh();
          });
        }}
      >
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Binding</span>
          <select name="bindingKey" required className={input}>
            {BINDING_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
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
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={pending || postable.length === 0}
            className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black disabled:opacity-40"
          >
            {pending ? "Saving…" : "Save binding"}
          </button>
        </div>
      </form>
    </div>
  );
}
