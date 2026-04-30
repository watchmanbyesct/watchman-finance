/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import Link from "next/link";
import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { GlTrialBalanceSnapshotForm } from "@/components/finance/connected/workflow-extensions-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { ModuleWorkspaceStatus } from "@/components/finance/module-workspace-status";
import { GlSetupRequired } from "@/components/finance/gl/gl-setup-required";
import { listGlTrialBalanceSnapshotsForEntity } from "@/lib/finance/read-queries";
import { getFiscalPeriodsByEntity } from "@/modules/finance-core/repositories/finance-core-repository";

export const metadata = { title: "Trial balance snapshots — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();

  if (!workspace) {
    return (
      <div className="max-w-5xl space-y-6">
        <div>
          <h1 className="wf-page-title">Trial balance snapshots</h1>
          <p className="text-sm text-neutral-500 mt-1">Pack 021 — Cached trial balance JSON</p>
        </div>
        <ModuleWorkspaceStatus packNumber={21} workspaceName="Reporting" />
        <GlSetupRequired />
      </div>
    );
  }

  let rows: Awaited<ReturnType<typeof listGlTrialBalanceSnapshotsForEntity>> = [];
  let fiscalPeriods: Awaited<ReturnType<typeof getFiscalPeriodsByEntity>> = [];
  let loadError: string | null = null;
  try {
    [rows, fiscalPeriods] = await Promise.all([
      listGlTrialBalanceSnapshotsForEntity(workspace.tenantId, workspace.entityId),
      getFiscalPeriodsByEntity(workspace.tenantId, workspace.entityId),
    ]);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Failed to load snapshots.";
  }

  return (
    <WorkflowPageFrame
      title="Trial balance snapshots"
      moduleLine="Pack 021 trial-balance snapshot cache with Pack 023 permission bridge. Persist balanced totals and JSON payloads by entity/period/as-of date."
      packNumber={21}
      workspaceName="Reporting"
      workspace={workspace}
      loadError={loadError}
    >
      <div className="inline-flex items-center rounded-full border border-amber-700/40 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
        Workflow Shell: scheduled generation and reconciliation checks deferred
      </div>
      <p className="text-sm text-neutral-500">
        Back to{" "}
        <Link href="/finance/reporting-hub" className="text-amber-500 hover:text-amber-400">
          Reporting hub
        </Link>{" "}
        or{" "}
        <Link href="/finance/periods" className="text-amber-500 hover:text-amber-400">
          Fiscal periods
        </Link>
        . If you have no snapshots, create at least one fiscal period first.
      </p>

      <GlTrialBalanceSnapshotForm workspace={workspace} fiscalPeriods={fiscalPeriods} />

      <div>
        <h2 className="text-sm font-medium text-neutral-300 mb-3">Saved snapshots</h2>
        <WorkflowDataTable
          columns={[
            { key: "as_of_date", label: "As of" },
            { key: "snapshot_kind", label: "Kind" },
            { key: "snapshot_status", label: "Status" },
            { key: "total_debit", label: "Debit" },
            { key: "total_credit", label: "Credit" },
            { key: "generated_at", label: "Generated" },
          ]}
          rows={rows as Record<string, unknown>[]}
          emptyMessage="No snapshots yet."
        />
      </div>
    </WorkflowPageFrame>
  );
}
