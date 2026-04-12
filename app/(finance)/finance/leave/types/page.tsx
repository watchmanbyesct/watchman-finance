import { ModuleWorkspaceStatus } from "@/components/finance/module-workspace-status";

export const metadata = { title: "Leave Types — Watchman Finance" };

export default function Page() {
  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="wf-page-title">Leave Types</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Module: Leave & Accruals &mdash; Pack 005
        </p>
      </div>
      <ModuleWorkspaceStatus packNumber={5} workspaceName="Leave & Accruals" />

    </div>
  );
}
