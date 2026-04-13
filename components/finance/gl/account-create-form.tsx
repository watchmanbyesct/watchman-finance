import "server-only";

import { submitCreateAccountForm } from "@/modules/finance-core/actions/finance-core-actions";
import type { FinanceWorkspace } from "@/lib/context/resolve-finance-workspace";

type CategoryRow = { id: string; code: string; name: string };

export function AccountCreateForm({
  workspace,
  categories,
}: {
  workspace: FinanceWorkspace;
  categories: CategoryRow[];
}) {
  return (
    <div className="wf-card">
      <h2 className="text-sm font-medium text-neutral-200 mb-4">Add account</h2>
      <form action={submitCreateAccountForm} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <input type="hidden" name="tenantId" value={workspace.tenantId} />
        <input type="hidden" name="entityId" value={workspace.entityId} />

        <label className="flex flex-col gap-1.5 md:col-span-2">
          <span className="text-neutral-500 text-xs">Category</span>
          <select
            name="accountCategoryId"
            required
            className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-neutral-200 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
          >
            <option value="">Select category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-neutral-500 text-xs">Code</span>
          <input
            name="code"
            required
            maxLength={50}
            className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-neutral-200 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
            placeholder="e.g. 4000"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-neutral-500 text-xs">Name</span>
          <input
            name="name"
            required
            maxLength={255}
            className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-neutral-200 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
            placeholder="Account name"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-neutral-500 text-xs">Account type</span>
          <input
            name="accountType"
            required
            className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-neutral-200 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
            placeholder="e.g. expense, asset"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-neutral-500 text-xs">Normal balance</span>
          <select
            name="normalBalance"
            required
            className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-neutral-200 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
          >
            <option value="debit">Debit</option>
            <option value="credit">Credit</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5 md:col-span-2">
          <span className="text-neutral-500 text-xs">Description (optional)</span>
          <input
            name="description"
            className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-neutral-200 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
          />
        </label>

        <input type="hidden" name="allowPosting" value="false" />
        <label className="flex items-center gap-2 md:col-span-2">
          <input type="checkbox" name="allowPosting" value="true" defaultChecked className="rounded border-white/20" />
          <span className="text-neutral-400 text-xs">Allow posting</span>
        </label>

        <div className="md:col-span-2">
          <button
            type="submit"
            className="rounded-md bg-amber-500/90 text-black text-sm font-medium px-4 py-2 hover:bg-amber-400 transition-colors"
          >
            Create account
          </button>
        </div>
      </form>
    </div>
  );
}
