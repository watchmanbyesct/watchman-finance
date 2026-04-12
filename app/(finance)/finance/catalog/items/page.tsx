import { ModuleWorkspaceStatus } from "@/components/finance/module-workspace-status";

export const metadata = { title: "Catalog Items — Watchman Finance" };

export default function Page() {
  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="wf-page-title">Catalog Items</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Module: Products & Services &mdash; Pack 007
        </p>
      </div>
      <ModuleWorkspaceStatus packNumber={7} workspaceName="Products & Services" />

    </div>
  );
}
