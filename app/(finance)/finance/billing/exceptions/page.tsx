/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { BillingExceptionResolveForm } from "@/components/finance/connected/catalog-billing-inventory-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { getCatalogBillingPack013Flags } from "@/lib/finance/catalog-billing-pack013-flags";
import { listBillingExceptionEventsForTenant } from "@/lib/finance/read-queries";
import Link from "next/link";

export const metadata = { title: "Billing exceptions — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let openForForm: { id: string; exception_code: string; exception_message: string; resolution_status: string }[] = [];
  let loadError: string | null = null;
  const p13 = workspace ? await getCatalogBillingPack013Flags(workspace.tenantId) : null;

  if (workspace) {
    try {
      rows = (await listBillingExceptionEventsForTenant(workspace.tenantId)) as Record<string, unknown>[];
      const openRows = await listBillingExceptionEventsForTenant(workspace.tenantId, "open");
      openForForm = openRows as typeof openForForm;
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load exceptions.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Billing — exception events"
      moduleLine="Pack 007 list · Pack 013: resolve with billing.rule.manage (+ billing module entitlement)"
      packNumber={7}
      workspaceName="Billing"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && p13 && (
        <div className="space-y-6">
          <p className="text-xs text-neutral-500">
            Resolving exceptions requires `billing.rule.manage` and `billing` module entitlement.
          </p>
          <BillingExceptionResolveForm
            workspace={workspace}
            openExceptions={openForForm}
            canManage={p13.canResolveBillingExceptions}
          />
          <p className="text-sm text-neutral-500">
            Exception events are emitted by billing workflows. Use the form above to mark rows resolved or ignored
            (sets <code className="text-xs text-neutral-500">resolved_at</code>).
          </p>
          <WorkflowDataTable
            columns={[
              { key: "exception_code", label: "Code" },
              { key: "exception_message", label: "Message" },
              { key: "resolution_status", label: "Resolution" },
              { key: "created_at", label: "Created" },
            ]}
            rows={rows}
            emptyMessage="No billing exceptions yet. Exceptions appear when candidate/rule processing fails validation."
          />
          <p className="text-xs text-neutral-500">
            Check upstream flows:{" "}
            <Link href="/finance/billing/candidates" className="text-amber-500 hover:text-amber-400">
              billable candidates
            </Link>{" "}
            and{" "}
            <Link href="/finance/integration/pipeline" className="text-amber-500 hover:text-amber-400">
              integration pipeline
            </Link>
            .
          </p>
        </div>
      )}
    </WorkflowPageFrame>
  );
}
