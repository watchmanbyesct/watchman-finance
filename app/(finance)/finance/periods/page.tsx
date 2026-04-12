import { ModuleWorkspaceStatus } from "@/components/finance/module-workspace-status";

export const metadata = { title: "Fiscal Periods — Watchman Finance" };

export default function Page() {
  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="wf-page-title">Fiscal Periods</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Module: General Ledger &mdash; Pack 001
        </p>
      </div>
      <ModuleWorkspaceStatus packNumber={1} workspaceName="General Ledger" />

    </div>
  );
}
