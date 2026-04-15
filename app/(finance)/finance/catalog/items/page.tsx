/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { CatalogCategoryForm, CatalogItemForm } from "@/components/finance/connected/catalog-billing-inventory-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { getCatalogBillingPack013Flags } from "@/lib/finance/catalog-billing-pack013-flags";
import { listCatalogCategoriesForTenant, listCatalogItemsForTenant } from "@/lib/finance/read-queries";

export const metadata = { title: "Catalog items — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let items: Record<string, unknown>[] = [];
  let categories: Record<string, unknown>[] = [];
  let loadError: string | null = null;
  const p13 = workspace ? await getCatalogBillingPack013Flags(workspace.tenantId) : null;

  if (workspace) {
    try {
      const [it, cat] = await Promise.all([
        listCatalogItemsForTenant(workspace.tenantId),
        listCatalogCategoriesForTenant(workspace.tenantId),
      ]);
      items = it as Record<string, unknown>[];
      categories = cat as Record<string, unknown>[];
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load catalog.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Catalog — categories & items"
      moduleLine="Pack 007 schema · Pack 013: catalog.category.manage, catalog.item.manage (+ catalog module entitlement)"
      packNumber={7}
      workspaceName="Products & Services"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && p13 && (
        <>
          <CatalogCategoryForm workspace={workspace} canManage={p13.canManageCategories} />
          <CatalogItemForm workspace={workspace} canManage={p13.canManageItems} />
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Categories</h2>
            <WorkflowDataTable
              columns={[
                { key: "category_code", label: "Code" },
                { key: "category_name", label: "Name" },
                { key: "status", label: "Status" },
              ]}
              rows={categories}
            />
          </div>
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Items</h2>
            <WorkflowDataTable
              columns={[
                { key: "item_code", label: "Code" },
                { key: "item_name", label: "Name" },
                { key: "billing_method", label: "Billing" },
                { key: "is_active", label: "Active" },
              ]}
              rows={items}
            />
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
