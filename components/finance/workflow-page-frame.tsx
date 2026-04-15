/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import type { ReactNode } from "react";
import { ModuleWorkspaceStatus } from "@/components/finance/module-workspace-status";
import { GlWorkspaceBanner } from "@/components/finance/gl/gl-workspace-banner";
import { GlSetupRequired } from "@/components/finance/gl/gl-setup-required";
import type { FinanceWorkspace } from "@/lib/context/resolve-finance-workspace";

export function WorkflowPageFrame({
  title,
  moduleLine,
  packNumber,
  workspaceName,
  workspace,
  loadError,
  /** When a workspace exists, set false for routes that are still list-only shells. Defaults to true. */
  workflowConnected = true,
  children,
}: {
  title: string;
  moduleLine: string;
  packNumber: number;
  workspaceName: string;
  workspace: FinanceWorkspace | null;
  loadError?: string | null;
  workflowConnected?: boolean;
  children?: ReactNode;
}) {
  if (!workspace) {
    return (
      <div className="max-w-5xl space-y-6">
        <div>
          <h1 className="wf-page-title">{title}</h1>
          <p className="text-sm text-neutral-500 mt-1">{moduleLine}</p>
        </div>
        <ModuleWorkspaceStatus packNumber={packNumber} workspaceName={workspaceName} />
        <GlSetupRequired />
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="wf-page-title">{title}</h1>
        <p className="text-sm text-neutral-500 mt-1">{moduleLine}</p>
      </div>

      <ModuleWorkspaceStatus
        packNumber={packNumber}
        workspaceName={workspaceName}
        workflowConnected={workflowConnected}
      />

      <GlWorkspaceBanner workspace={workspace} />

      {loadError ? (
        <div className="rounded-lg border border-red-500/30 bg-red-950/25 px-4 py-3 text-sm text-red-200">
          {loadError}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
