/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import { WATCHMAN_DEPLOYED_MIGRATION_PACK } from "@/lib/constants/watchman-migrations";

export function ModuleWorkspaceStatus({
  packNumber,
  workspaceName,
  workflowConnected = false,
}: {
  packNumber: number;
  workspaceName: string;
  /** When true, schema is live and this route already lists/forms/actions (e.g. GL). */
  workflowConnected?: boolean;
}) {
  const schemaReady = packNumber <= WATCHMAN_DEPLOYED_MIGRATION_PACK;
  const packLabel = `Pack ${String(packNumber).padStart(3, "0")}`;

  if (schemaReady && workflowConnected) {
    return (
      <div className="wf-card border-emerald-500/25 bg-emerald-950/30">
        <p className="text-sm text-emerald-400 font-medium mb-2">Workspace connected</p>
        <p className="text-sm text-neutral-300 leading-relaxed">
          <span className="text-neutral-100 font-medium">{workspaceName}</span> ({packLabel}) — this page
          loads live data and uses server actions for the workflows below.
        </p>
      </div>
    );
  }

  if (schemaReady) {
    return (
      <div className="wf-card border-emerald-500/25 bg-emerald-950/30">
        <p className="text-sm text-emerald-400 font-medium mb-2">Schema deployed</p>
        <p className="text-sm text-neutral-300 leading-relaxed">
          <span className="text-neutral-100 font-medium">{workspaceName}</span> ({packLabel}) tables
          and RLS are in your database. This route is still a workspace shell: connect lists, forms, and
          server actions when you build each workflow.
        </p>
      </div>
    );
  }

  return (
    <div className="wf-card border-amber-500/20 bg-amber-500/5">
      <p className="text-sm text-amber-300 font-medium mb-2">Migration pack not applied yet</p>
      <p className="text-sm text-neutral-400 leading-relaxed">
        This area is defined in <span className="text-neutral-200 font-medium">{packLabel}</span>. Apply
        that SQL pack to Supabase (and bump{" "}
        <code className="text-xs text-neutral-300">WATCHMAN_DEPLOYED_MIGRATION_PACK</code> in{" "}
        <code className="text-xs text-neutral-300">lib/constants/watchman-migrations.ts</code>
        ) when it is live, then refresh this message.
      </p>
    </div>
  );
}
