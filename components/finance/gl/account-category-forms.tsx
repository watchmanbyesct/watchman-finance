"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { FinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { createAccountCategory, seedQbdAccountCategories } from "@/modules/finance-core/actions/finance-core-actions";
import { QBD_ACCOUNT_TYPE_VALUES } from "@/lib/finance/account-pack025-metadata";

const input =
  "rounded-md border border-white/10 bg-white/5 px-3 py-2 text-neutral-200 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/40";

function fmt(s: string): string {
  return s.replaceAll("_", " ");
}

export function QbdAccountCategorySeedButton({ workspace }: { workspace: FinanceWorkspace }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="wf-card border border-amber-500/20 bg-amber-950/10 space-y-2.5">
      <p className="text-sm font-medium text-neutral-100">QBD account categories</p>
      <p className="text-xs text-neutral-500 leading-relaxed">
        Upserts a QuickBooks Desktop–style category list (bank, AR, AP, income, expense buckets, plus legacy codes used
        by the default COA seed). Safe to re-run.
      </p>
      {msg ? <p className="text-xs text-amber-400">{msg}</p> : null}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          start(async () => {
            const res = await seedQbdAccountCategories({ tenantId: workspace.tenantId });
            setMsg(res.message);
            if (res.success) router.refresh();
          });
        }}
        className="rounded-md border border-amber-500/30 bg-amber-500/90 px-4 py-2 text-sm font-medium text-black hover:bg-amber-400 disabled:opacity-60"
      >
        {pending ? "Seeding…" : "Seed QBD categories"}
      </button>
    </div>
  );
}

export function CreateAccountCategoryForm({ workspace }: { workspace: FinanceWorkspace }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Create custom category</h2>
      <p className="text-xs text-neutral-500 leading-relaxed">
        Add your own grouping for the chart of accounts. Code must be unique per tenant (lowercase, underscores). GL
        type and normal balance define how accounts in this category behave; QBD type drives default new-account
        classification.
      </p>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const qbdRaw = String(fd.get("qbdAccountType") ?? "").trim();
            const res = await createAccountCategory({
              tenantId: workspace.tenantId,
              code: String(fd.get("code") ?? "").trim(),
              name: String(fd.get("name") ?? "").trim(),
              categoryType: String(fd.get("categoryType") ?? "expense") as
                | "asset"
                | "liability"
                | "equity"
                | "revenue"
                | "expense",
              normalBalance: String(fd.get("normalBalance") ?? "debit") as "debit" | "credit",
              qbdAccountType: qbdRaw ? (qbdRaw as (typeof QBD_ACCOUNT_TYPE_VALUES)[number]) : undefined,
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
          <span className="text-neutral-500 text-xs">Code</span>
          <input name="code" required maxLength={80} className={input} placeholder="e.g. marketing_expense" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Display name</span>
          <input name="name" required maxLength={255} className={input} placeholder="e.g. Marketing Expense" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">GL category type</span>
          <select name="categoryType" className={input}>
            <option value="asset">asset</option>
            <option value="liability">liability</option>
            <option value="equity">equity</option>
            <option value="revenue">revenue</option>
            <option value="expense">expense</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Normal balance</span>
          <select name="normalBalance" className={input}>
            <option value="debit">debit</option>
            <option value="credit">credit</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">QBD account type (optional default)</span>
          <select name="qbdAccountType" className={input}>
            <option value="">Auto from GL type</option>
            {QBD_ACCOUNT_TYPE_VALUES.map((v) => (
              <option key={v} value={v}>
                {fmt(v)}
              </option>
            ))}
          </select>
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black hover:bg-amber-500 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Create category"}
          </button>
        </div>
      </form>
    </div>
  );
}
