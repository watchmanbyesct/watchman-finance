import { ModuleWorkspaceStatus } from "@/components/finance/module-workspace-status";

export const metadata = { title: "Consolidation — Watchman Finance" };

export default function Page() {
  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="wf-page-title">Consolidation groups</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Module: Multi-entity consolidation &mdash; Pack 011
        </p>
      </div>
      <ModuleWorkspaceStatus packNumber={11} workspaceName="Consolidation" />
    </div>
  );
}
