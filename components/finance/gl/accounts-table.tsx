import type { Account } from "@/types";
import type { FinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { AccountArchiveButton } from "@/components/finance/gl/account-archive-button";

export function AccountsTable({
  accounts,
  workspace,
}: {
  accounts: Account[];
  workspace: FinanceWorkspace;
}) {
  if (!accounts.length) {
    return (
      <p className="text-sm text-neutral-500 py-8 text-center border border-dashed border-white/10 rounded-lg">
        No accounts yet. Add your first account using the form above.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <table className="w-full text-sm text-left">
        <thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-neutral-500">
          <tr>
            <th className="px-4 py-3 font-medium">Code</th>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Balance</th>
            <th className="px-4 py-3 font-medium">Posting</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium w-28" />
          </tr>
        </thead>
        <tbody className="divide-y divide-white/8">
          {accounts.map((a) => (
            <tr key={a.id} className="text-neutral-300 hover:bg-white/[0.02]">
              <td className="px-4 py-2.5 font-mono text-xs text-amber-500/90">{a.code}</td>
              <td className="px-4 py-2.5">{a.name}</td>
              <td className="px-4 py-2.5 text-neutral-500">{a.accountType}</td>
              <td className="px-4 py-2.5 text-neutral-500 capitalize">{a.normalBalance}</td>
              <td className="px-4 py-2.5">{a.allowPosting ? "Yes" : "No"}</td>
              <td className="px-4 py-2.5">
                {a.isActive ? (
                  <span className="text-emerald-500/90 text-xs">Active</span>
                ) : (
                  <span className="text-neutral-600 text-xs">Inactive</span>
                )}
              </td>
              <td className="px-4 py-2.5">
                {a.isActive ? (
                  <AccountArchiveButton
                    tenantId={workspace.tenantId}
                    entityId={workspace.entityId}
                    accountId={a.id}
                    code={a.code}
                  />
                ) : (
                  <span className="text-xs text-neutral-600">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
