/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import Link from "next/link";
import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { Pack007SeedButton } from "@/components/finance/connected/pack007-seed-button";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { getCatalogBillingPack013Flags } from "@/lib/finance/catalog-billing-pack013-flags";

export const metadata = { title: "Pack 007 — Catalog & billing — Watchman Finance" };

const ROUTES = [
  {
    href: "/finance/catalog/items",
    label: "Catalog — categories & items",
    permissions: "catalog.category.manage, catalog.item.manage",
    serverActions: "createCatalogCategory, createCatalogItem",
  },
  {
    href: "/finance/catalog/pricing",
    label: "Catalog — item prices",
    permissions: "catalog.price.manage",
    serverActions: "createCatalogItemPrice",
  },
  {
    href: "/finance/billing/rules",
    label: "Billing — rules",
    permissions: "billing.rule.manage",
    serverActions: "createBillingRule",
  },
  {
    href: "/finance/billing/candidates",
    label: "Billing — billable event candidates",
    permissions: "billing.candidate.manage",
    serverActions: "createBillableEventCandidate",
  },
  {
    href: "/finance/billing/exceptions",
    label: "Billing — exception events (list + resolve)",
    permissions: "list: tenant members with billing read · resolve: billing.rule.manage",
    serverActions: "list (read queries) · resolveBillingException",
  },
] as const;

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  const p13 = workspace ? await getCatalogBillingPack013Flags(workspace.tenantId) : null;

  type MutateCell = { label: string; ok: boolean };
  const rowMutate: MutateCell[][] = p13
    ? [
        [
          { label: "categories", ok: p13.canManageCategories },
          { label: "items", ok: p13.canManageItems },
        ],
        [{ label: "prices", ok: p13.canManagePrices }],
        [{ label: "rules", ok: p13.canManageBillingRules }],
        [{ label: "candidates", ok: p13.canManageCandidates }],
        [{ label: "resolve", ok: p13.canResolveBillingExceptions }],
      ]
    : [];

  return (
    <WorkflowPageFrame
      title="Pack 007 — Catalog & contract billing"
      moduleLine="Migration pack 007: sellable catalog, prices, billing rules, billable candidates, and exception events. Pack 013 adds granular permissions and module entitlements (catalog, billing)."
      packNumber={7}
      workspaceName="Catalog & billing"
      workspace={workspace}
    >
      {workspace && (
        <div className="space-y-6">
          <Pack007SeedButton
            tenantId={workspace.tenantId}
            entityId={workspace.entityId}
            enabled={
              !!p13 &&
              p13.canManageCategories &&
              p13.canManageItems &&
              p13.canManagePrices &&
              p13.canManageBillingRules &&
              p13.canManageCandidates
            }
          />
          <div className="wf-card space-y-4">
            <p className="text-sm text-neutral-400 leading-relaxed">
              Each workflow below loads lists in a server component and exposes mutation forms that call server
              actions. Actions enforce{" "}
              <Link href="/finance/pack-013" className="text-amber-500 hover:text-amber-400">
                Pack 013
              </Link>{" "}
              permission codes and the <strong>catalog</strong> / <strong>billing</strong> module flags on your
              tenant.
            </p>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/finance/pack-013" className="text-amber-500 hover:text-amber-400">
                  Pack 013 — full permissions map (all modules)
                </Link>
              </li>
            </ul>
          </div>

          {p13 ? (
            <div className="wf-card overflow-x-auto">
              <h2 className="wf-section-title mb-1">Pack 013 — Catalog &amp; billing map</h2>
              <p className="text-xs text-neutral-500 mb-4">
                “Mutate” reflects whether your current role can submit the create/resolve form on that route (module
                entitlement + permission). Lists may still be visible without mutate access.
              </p>
              <table className="wf-table text-sm min-w-[42rem]">
                <thead>
                  <tr>
                    <th>Workflow</th>
                    <th>Permission(s)</th>
                    <th>Server actions</th>
                    <th>Mutate</th>
                  </tr>
                </thead>
                <tbody>
                  {ROUTES.map((r, i) => (
                    <tr key={r.href}>
                      <td>
                        <Link href={r.href} className="text-amber-500 hover:text-amber-400 font-medium">
                          {r.label}
                        </Link>
                      </td>
                      <td className="text-neutral-500 text-xs max-w-[14rem]">{r.permissions}</td>
                      <td className="text-neutral-500 text-xs font-mono">{r.serverActions}</td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {(rowMutate[i] ?? []).map((c) => (
                            <span
                              key={c.label}
                              className={
                                c.ok
                                  ? "wf-badge wf-badge-success text-[10px]"
                                  : "wf-badge wf-badge-neutral text-[10px]"
                              }
                              title={c.label}
                            >
                              {c.label}:{c.ok ? "y" : "n"}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-neutral-600 mt-3">
                Module entitlements: catalog={p13.catalogModule ? "on" : "off"} · billing={p13.billingModule ? "on" : "off"}
              </p>
            </div>
          ) : null}
        </div>
      )}
    </WorkflowPageFrame>
  );
}
