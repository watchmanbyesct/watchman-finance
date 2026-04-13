import type { FinanceWorkspace } from "@/lib/context/resolve-finance-workspace";

export function GlWorkspaceBanner({ workspace }: { workspace: FinanceWorkspace }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-neutral-400">
      <span className="text-neutral-200">{workspace.tenantDisplayName}</span>
      <span className="mx-2 text-neutral-600">/</span>
      <span className="text-neutral-200">{workspace.entityCode}</span>
      <span className="text-neutral-500"> — {workspace.entityDisplayName}</span>
    </div>
  );
}
