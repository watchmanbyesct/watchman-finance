/**
 * Copyright 2026 ESCT Holdings Inc.
 * Developed by Owens F. Shepard for ESCT Holdings Inc.
 */

import { ModuleWorkspaceStatus } from "@/components/finance/module-workspace-status";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { getFiscalPeriodsByEntity } from "@/modules/finance-core/repositories/finance-core-repository";
import { GlWorkspaceBanner } from "@/components/finance/gl/gl-workspace-banner";
import { GlSetupRequired } from "@/components/finance/gl/gl-setup-required";
import { FiscalPeriodCreateForm } from "@/components/finance/gl/fiscal-period-create-form";
import { FiscalPeriodsTable } from "@/components/finance/gl/fiscal-periods-table";
import { FiscalPeriodSeedButton } from "@/components/finance/gl/fiscal-period-seed-button";

export const metadata = { title: "Fiscal Periods — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();

  if (!workspace) {
    return (
      <div className="max-w-5xl space-y-6">
        <div>
          <h1 className="wf-page-title">Fiscal Periods</h1>
          <p className="text-sm text-neutral-500 mt-1">Module: General Ledger &mdash; Pack 001</p>
        </div>
        <ModuleWorkspaceStatus packNumber={1} workspaceName="General Ledger" />
        <GlSetupRequired />
      </div>
    );
  }

  let periods: Awaited<ReturnType<typeof getFiscalPeriodsByEntity>> = [];
  let loadError: string | null = null;

  try {
    periods = await getFiscalPeriodsByEntity(workspace.tenantId, workspace.entityId);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Failed to load fiscal periods.";
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="wf-page-title">Fiscal Periods</h1>
        <p className="text-sm text-neutral-500 mt-1">Module: General Ledger &mdash; Pack 001</p>
      </div>

      <ModuleWorkspaceStatus packNumber={1} workspaceName="General Ledger" workflowConnected />

      <GlWorkspaceBanner workspace={workspace} />

      {loadError ? (
        <div className="rounded-lg border border-red-500/30 bg-red-950/25 px-4 py-3 text-sm text-red-200">
          {loadError}
        </div>
      ) : (
        <>
          <FiscalPeriodSeedButton tenantId={workspace.tenantId} entityId={workspace.entityId} />
          <FiscalPeriodCreateForm workspace={workspace} />

          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Periods</h2>
            <FiscalPeriodsTable periods={periods} workspace={workspace} />
          </div>
        </>
      )}
    </div>
  );
}
