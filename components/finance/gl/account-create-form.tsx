/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { createAccount } from "@/modules/finance-core/actions/finance-core-actions";
import type { FinanceWorkspace } from "@/lib/context/resolve-finance-workspace";

export type AccountCategoryOption = {
  id: string;
  code: string;
  name: string;
  category_type: string;
  normal_balance: string;
  integration_account_type?: string | null;
};

const TYPE_ORDER = ["asset", "liability", "equity", "revenue", "expense"] as const;
const TYPE_LABEL: Record<string, string> = {
  asset: "Assets",
  liability: "Liabilities",
  equity: "Equity",
  revenue: "Income",
  expense: "Expenses",
};

const input =
  "rounded-md border border-white/10 bg-white/5 px-3 py-2 text-neutral-200 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/40";

function fmt(s: string): string {
  return s.replaceAll("_", " ");
}

export function AccountCreateForm({
  workspace,
  categories,
}: {
  workspace: FinanceWorkspace;
  categories: AccountCategoryOption[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [catId, setCatId] = useState("");

  const byId = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const selected = catId ? byId.get(catId) : undefined;

  const grouped = useMemo(() => {
    const m = new Map<string, AccountCategoryOption[]>();
    for (const t of TYPE_ORDER) m.set(t, []);
    for (const c of categories) {
      const t = c.category_type;
      if (!m.has(t)) m.set(t, []);
      m.get(t)!.push(c);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.name.localeCompare(b.name));
    return m;
  }, [categories]);

  return (
    <div className="wf-card">
      <h2 className="text-sm font-medium text-neutral-200 mb-4">Add account</h2>
      <p className="text-xs text-neutral-500 mb-4 leading-relaxed">
        Pick a category first — GL account type, normal balance, and default integration taxonomy come from the
        category. Seed integration categories if the list is short.
      </p>
      {msg && <p className="text-xs text-amber-400 mb-3">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          if (!catId) {
            setMsg("Select a category.");
            return;
          }
          const form = e.currentTarget;
          const fd = new FormData(form);
          const allowPostingEl = form.querySelector<HTMLInputElement>('input[name="allowPosting"]');
          start(async () => {
            setMsg(null);
            const res = await createAccount({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              accountCategoryId: catId,
              code: String(fd.get("code") ?? "").trim(),
              name: String(fd.get("name") ?? "").trim(),
              description: String(fd.get("description") ?? "").trim() || undefined,
              allowPosting: allowPostingEl?.checked ?? true,
            });
            setMsg(res.message);
            if (res.success) {
              (e.target as HTMLFormElement).reset();
              setCatId("");
              router.refresh();
            }
          });
        }}
      >
        <input type="hidden" name="tenantId" value={workspace.tenantId} />
        <input type="hidden" name="entityId" value={workspace.entityId} />

        <label className="flex flex-col gap-1.5 md:col-span-2">
          <span className="text-neutral-500 text-xs">Category</span>
          <select
            required
            className={input}
            value={catId}
            onChange={(e) => {
              setCatId(e.target.value);
              setMsg(null);
            }}
          >
            <option value="">Select category…</option>
            {TYPE_ORDER.map((t) => {
              const list = grouped.get(t) ?? [];
              if (!list.length) return null;
              return (
                <optgroup key={t} label={TYPE_LABEL[t] ?? fmt(t)}>
                  {list.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </label>

        {selected && (
          <div className="md:col-span-2 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-neutral-400 space-y-1">
            <p>
              <span className="text-neutral-500">GL type:</span>{" "}
              <span className="text-neutral-200">{selected.category_type}</span>
              {" · "}
              <span className="text-neutral-500">Normal balance:</span>{" "}
              <span className="text-neutral-200">{selected.normal_balance}</span>
            </p>
            <p>
              <span className="text-neutral-500">Default integration type:</span>{" "}
              <span className="text-neutral-200">
                {selected.integration_account_type ? fmt(selected.integration_account_type) : "from GL type"}
              </span>
            </p>
          </div>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-neutral-500 text-xs">Code</span>
          <input
            name="code"
            required
            maxLength={50}
            className={input}
            placeholder="e.g. 4000"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-neutral-500 text-xs">Name</span>
          <input
            name="name"
            required
            maxLength={255}
            className={input}
            placeholder="Account name"
          />
        </label>

        <label className="flex flex-col gap-1.5 md:col-span-2">
          <span className="text-neutral-500 text-xs">Description (optional)</span>
          <input name="description" className={input} />
        </label>

        <label className="flex items-center gap-2 md:col-span-2">
          <input type="checkbox" name="allowPosting" defaultChecked className="rounded border-white/20" />
          <span className="text-neutral-400 text-xs">Allow posting</span>
        </label>

        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={pending || !categories.length}
            className="rounded-md bg-amber-500/90 text-black text-sm font-medium px-4 py-2 hover:bg-amber-400 transition-colors disabled:opacity-40"
          >
            {pending ? "Creating…" : "Create account"}
          </button>
        </div>
      </form>
    </div>
  );
}
