import { ModuleWorkspaceStatus } from "@/components/finance/module-workspace-status";

export const metadata = { title: "System health — Watchman Finance" };

export default function Page() {
  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="wf-page-title">System health checks</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Module: Operational readiness &mdash; Pack 012
        </p>
      </div>
      <ModuleWorkspaceStatus packNumber={12} workspaceName="Operations & QA" />
    </div>
  );
}
