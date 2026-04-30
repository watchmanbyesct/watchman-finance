/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { BillingRuleForm } from "@/components/finance/connected/catalog-billing-inventory-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { getCatalogBillingPack013Flags } from "@/lib/finance/catalog-billing-pack013-flags";
import { listBillingRulesForTenant } from "@/lib/finance/read-queries";
import Link from "next/link";

export const metadata = { title: "Billing rules — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let loadError: string | null = null;
  const p13 = workspace ? await getCatalogBillingPack013Flags(workspace.tenantId) : null;

  if (workspace) {
    try {
      rows = (await listBillingRulesForTenant(workspace.tenantId)) as Record<string, unknown>[];
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load billing rules.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Billing — rules"
      moduleLine="Pack 007 schema · Pack 013: billing.rule.manage (+ billing module entitlement)"
      packNumber={7}
      workspaceName="Billing"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && p13 && (
        <>
          <p className="text-xs text-neutral-500">
            Requires `billing.rule.manage` and `billing` module entitlement. Configure catalog items/prices first for cleaner rule setup.
          </p>
          <BillingRuleForm workspace={workspace} canManage={p13.canManageBillingRules} />
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Rules</h2>
            <WorkflowDataTable
              columns={[
                { key: "rule_code", label: "Code" },
                { key: "rule_name", label: "Name" },
                { key: "billing_trigger", label: "Trigger" },
                { key: "billing_frequency", label: "Frequency" },
                { key: "status", label: "Status" },
              ]}
              rows={rows}
              emptyMessage="No billing rules yet. Create a rule above to begin billing automation."
            />
            <p className="mt-2 text-xs text-neutral-500">
              Setup links:{" "}
              <Link href="/finance/catalog/items" className="text-amber-500 hover:text-amber-400">
                catalog items
              </Link>{" "}
              ·{" "}
              <Link href="/finance/catalog/pricing" className="text-amber-500 hover:text-amber-400">
                catalog pricing
              </Link>
              .
            </p>
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
