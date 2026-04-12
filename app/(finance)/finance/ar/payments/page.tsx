import { ModuleWorkspaceStatus } from "@/components/finance/module-workspace-status";

export const metadata = { title: "Payments Received — Watchman Finance" };

export default function Page() {
  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="wf-page-title">Payments Received</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Module: Accounts Receivable &mdash; Pack 003
        </p>
      </div>
      <ModuleWorkspaceStatus packNumber={3} workspaceName="Accounts Receivable" />

    </div>
  );
}
