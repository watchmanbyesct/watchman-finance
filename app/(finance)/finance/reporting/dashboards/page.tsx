import { ModuleWorkspaceStatus } from "@/components/finance/module-workspace-status";

export const metadata = { title: "Dashboards — Watchman Finance" };

export default function Page() {
  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="wf-page-title">Dashboards</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Module: Reporting &mdash; Pack 009
        </p>
      </div>
      <ModuleWorkspaceStatus packNumber={9} workspaceName="Reporting" />

    </div>
  );
}
