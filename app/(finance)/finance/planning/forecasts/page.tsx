import { ModuleWorkspaceStatus } from "@/components/finance/module-workspace-status";

export const metadata = { title: "Forecasts — Watchman Finance" };

export default function Page() {
  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="wf-page-title">Forecasts</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Module: Budgeting & Forecasting &mdash; Pack 010
        </p>
      </div>
      <ModuleWorkspaceStatus packNumber={10} workspaceName="Budgeting & Forecasting" />

    </div>
  );
}
