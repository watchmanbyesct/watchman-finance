/**
 * Copyright 2026 ESCT Holdings Inc.
 * Developed by Owens F. Shepard for ESCT Holdings Inc.
 */

import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { CatalogPriceForm } from "@/components/finance/connected/catalog-billing-inventory-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { getCatalogBillingPack013Flags } from "@/lib/finance/catalog-billing-pack013-flags";
import { listCatalogItemPricesForTenant, listCatalogItemsForTenant } from "@/lib/finance/read-queries";

export const metadata = { title: "Catalog pricing — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let prices: Record<string, unknown>[] = [];
  let catalogItems: { id: string; item_code: string; item_name: string }[] = [];
  let loadError: string | null = null;
  const p13 = workspace ? await getCatalogBillingPack013Flags(workspace.tenantId) : null;

  if (workspace) {
    try {
      const [p, it] = await Promise.all([
        listCatalogItemPricesForTenant(workspace.tenantId),
        listCatalogItemsForTenant(workspace.tenantId),
      ]);
      prices = p as Record<string, unknown>[];
      catalogItems = it as typeof catalogItems;
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load pricing.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Catalog — item prices"
      moduleLine="Pack 007 schema · Pack 013: catalog.price.manage (+ catalog module entitlement)"
      packNumber={7}
      workspaceName="Products & Services"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && p13 && (
        <>
          <CatalogPriceForm
            workspace={workspace}
            catalogItems={catalogItems}
            canManage={p13.canManagePrices}
          />
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Price rows</h2>
            <WorkflowDataTable
              columns={[
                { key: "price_name", label: "Name" },
                { key: "unit_price", label: "Unit price" },
                { key: "effective_start_date", label: "Start" },
                { key: "effective_end_date", label: "End" },
                { key: "catalog_item_id", label: "Item id" },
              ]}
              rows={prices}
            />
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
