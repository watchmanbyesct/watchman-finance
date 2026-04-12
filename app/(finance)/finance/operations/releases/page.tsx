import { ModuleWorkspaceStatus } from "@/components/finance/module-workspace-status";

export const metadata = { title: "Releases — Watchman Finance" };

export default function Page() {
  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="wf-page-title">Release control</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Module: QA &amp; production readiness &mdash; Pack 012
        </p>
      </div>
      <ModuleWorkspaceStatus packNumber={12} workspaceName="Operations & QA" />
    </div>
  );
}
