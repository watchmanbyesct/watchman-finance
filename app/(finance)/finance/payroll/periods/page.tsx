import { ModuleWorkspaceStatus } from "@/components/finance/module-workspace-status";

export const metadata = { title: "Pay Periods — Watchman Finance" };

export default function Page() {
  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="wf-page-title">Pay Periods</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Module: Payroll &mdash; Pack 004
        </p>
      </div>
      <ModuleWorkspaceStatus packNumber={4} workspaceName="Payroll" />

    </div>
  );
}
