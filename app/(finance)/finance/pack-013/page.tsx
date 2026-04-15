/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import Link from "next/link";
import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";

export const metadata = { title: "Pack 013 — Module permissions — Watchman Finance" };

const WORKFLOWS: { href: string; label: string; permission: string; wiring: string }[] = [
  {
    href: "/finance/catalog/items",
    label: "Catalog — categories & items",
    permission: "catalog.category.manage · catalog.item.manage",
    wiring:
      "Lists + CatalogCategoryForm / CatalogItemForm → createCatalogCategory, createCatalogItem · UI gated via getCatalogBillingPack013Flags",
  },
  {
    href: "/finance/catalog/pricing",
    label: "Catalog — item prices",
    permission: "catalog.price.manage",
    wiring: "List + CatalogPriceForm → createCatalogItemPrice · UI gated via getCatalogBillingPack013Flags",
  },
  {
    href: "/finance/billing/rules",
    label: "Billing — rules",
    permission: "billing.rule.manage",
    wiring: "List + BillingRuleForm → createBillingRule · UI gated via getCatalogBillingPack013Flags",
  },
  {
    href: "/finance/billing/candidates",
    label: "Billing — billable event candidates",
    permission: "billing.candidate.manage",
    wiring: "List + BillableCandidateForm → createBillableEventCandidate · UI gated via getCatalogBillingPack013Flags",
  },
  {
    href: "/finance/billing/exceptions",
    label: "Billing — exception events (list + resolve)",
    permission: "billing.rule.manage (resolve); list uses read queries for workspace members",
    wiring: "List + BillingExceptionResolveForm → resolveBillingException · UI gated via getCatalogBillingPack013Flags",
  },
  {
    href: "/finance/inventory/items",
    label: "Inventory — categories, locations, items",
    permission: "inventory.category.manage · inventory.location.manage · inventory.item.manage",
    wiring: "Lists + InventoryCategoryForm / InventoryLocationForm / InventoryItemForm → createInventoryCategory, createInventoryLocation, createInventoryItem (+ stock/issue actions on other routes)",
  },
  {
    href: "/finance/reporting/reports",
    label: "Reporting — report definitions",
    permission: "reporting.definition.manage",
    wiring: "List + ReportDefinitionForm → createReportDefinition",
  },
  {
    href: "/finance/reporting/dashboards",
    label: "Reporting — dashboards",
    permission: "reporting.definition.manage",
    wiring: "List + DashboardDefinitionForm → createDashboardDefinition",
  },
  {
    href: "/finance/reporting/kpis",
    label: "Reporting — KPIs",
    permission: "reporting.definition.manage",
    wiring: "List + KpiDefinitionForm → createKpiDefinition",
  },
  {
    href: "/finance/reporting/close",
    label: "Reporting — close",
    permission: "reporting.definition.manage",
    wiring: "List + CloseChecklistForm → createCloseChecklist",
  },
  {
    href: "/finance/planning/budgets",
    label: "Planning — budgets",
    permission: "planning.budget.manage",
    wiring: "List + BudgetVersionForm / BudgetLineForm → createBudgetVersion, createBudgetLine",
  },
  {
    href: "/finance/planning/forecasts",
    label: "Planning — forecasts",
    permission: "planning.forecast.manage",
    wiring: "List + ForecastVersionForm / ForecastLineForm → createForecastVersion, createForecastLine",
  },
  {
    href: "/finance/planning/variance",
    label: "Planning — variance",
    permission: "planning.budget.manage / planning.forecast.manage",
    wiring: "Variance snapshot workflow (planning-actions)",
  },
  {
    href: "/finance/consolidation/groups",
    label: "Consolidation — groups & members",
    permission: "consolidation.group.manage",
    wiring: "List + ConsolidationGroupForm / AddEntityToConsolidationGroupForm → createConsolidationGroup, addEntityToConsolidationGroup, …",
  },
  {
    href: "/finance/consolidation/relationships",
    label: "Consolidation — entity relationships",
    permission: "consolidation.group.manage",
    wiring: "Relationship forms + lists (consolidation-actions)",
  },
  {
    href: "/finance/consolidation/snapshots",
    label: "Consolidation — snapshots",
    permission: "consolidation.group.manage",
    wiring: "Snapshot workflows (consolidation-actions)",
  },
  {
    href: "/finance/consolidation/intercompany-accounts",
    label: "Consolidation — IC accounts",
    permission: "consolidation.group.manage",
    wiring: "IC account shells (consolidation-actions)",
  },
  {
    href: "/finance/consolidation/intercompany-transactions",
    label: "Consolidation — IC transactions",
    permission: "consolidation.group.manage",
    wiring: "IC transaction shells (consolidation-actions)",
  },
  {
    href: "/finance/commercial/provisioning-templates",
    label: "Commercial — provisioning templates",
    permission: "consolidation.group.manage",
    wiring: "List + ProvisioningTemplateForm → createTenantProvisioningTemplate",
  },
  {
    href: "/finance/commercial/bootstrap",
    label: "Commercial — tenant bootstrap runs",
    permission: "consolidation.group.manage",
    wiring: "startTenantBootstrapRun (+ related consolidation-actions)",
  },
  {
    href: "/finance/commercial/feature-flags",
    label: "Commercial — tenant feature flags",
    permission: "consolidation.group.manage",
    wiring: "upsertTenantFeatureFlag",
  },
  {
    href: "/finance/commercial/activation",
    label: "Commercial — activation checklists & tasks",
    permission: "consolidation.group.manage",
    wiring: "createTenantActivationChecklist, createTenantActivationTask",
  },
  {
    href: "/finance/commercial/client-portal",
    label: "Commercial — client portal profiles",
    permission: "consolidation.group.manage",
    wiring: "createClientPortalProfile",
  },
  {
    href: "/finance/operations/test-suites",
    label: "Operations — test suites",
    permission: "operations.qa.manage",
    wiring: "List + TestSuiteForm → createTestSuite (+ related QA actions on sibling routes)",
  },
  {
    href: "/finance/operations-hub",
    label: "Operations hub",
    permission: "operations.qa.manage",
    wiring: "Index of Pack 012 QA / release / backup routes wired to operations-actions",
  },
];

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();

  return (
    <WorkflowPageFrame
      title="Pack 013 — Permissions & module entitlements (007–012)"
      moduleLine="Pack 013 seeds granular permissions and enables catalog, billing, inventory, reporting, planning, consolidation, and operations modules on each tenant. Apply after Packs 001–012."
      packNumber={13}
      workspaceName="Pack 013 extensions"
      workspace={workspace}
      workflowConnected
    >
      {workspace && (
        <div className="wf-card space-y-5">
          <p className="text-sm text-neutral-400 leading-relaxed">
            Each row is a <span className="text-neutral-200">connected workspace</span>: server components load read
            queries, tables render results, and client forms call the listed server actions (guarded by the permission
            in the second column). Run <code className="text-xs text-neutral-500">013_watchman_finance_module_permissions_entitlements.sql</code>{" "}
            on Supabase so finance admins and tenant owners receive these grants.
          </p>
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Hubs</h2>
            <ul className="text-sm space-y-1.5 text-amber-500/90">
              <li>
                <Link href="/finance/catalog-billing" className="hover:text-amber-400">
                  Pack 007 — Catalog & billing
                </Link>
              </li>
              <li>
                <Link href="/finance/inventory-assets" className="hover:text-amber-400">
                  Pack 008 — Inventory & assets
                </Link>
              </li>
              <li>
                <Link href="/finance/reporting-hub" className="hover:text-amber-400">
                  Pack 009 — Reporting
                </Link>
              </li>
              <li>
                <Link href="/finance/planning-hub" className="hover:text-amber-400">
                  Pack 010 — Planning
                </Link>
              </li>
              <li>
                <Link href="/finance/consolidation-commercial-hub" className="hover:text-amber-400">
                  Pack 011 — Consolidation & commercial
                </Link>
              </li>
              <li>
                <Link href="/finance/operations-hub" className="hover:text-amber-400">
                  Pack 012 — Operations & QA
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Permission → route → actions</h2>
            <ul className="space-y-3 text-sm">
              {WORKFLOWS.map((w) => (
                <li key={w.href} className="border border-white/8 rounded-md px-3 py-2.5">
                  <Link href={w.href} className="text-amber-500 hover:text-amber-400 font-medium">
                    {w.label}
                  </Link>
                  <p className="text-xs text-neutral-500 mt-1">
                    <span className="text-neutral-400">Permissions:</span> {w.permission}
                  </p>
                  <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">{w.wiring}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </WorkflowPageFrame>
  );
}
