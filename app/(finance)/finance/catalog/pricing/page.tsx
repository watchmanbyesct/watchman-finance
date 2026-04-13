import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { CatalogPriceForm } from "@/components/finance/connected/catalog-billing-inventory-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listCatalogItemPricesForTenant, listCatalogItemsForTenant } from "@/lib/finance/read-queries";

export const metadata = { title: "Catalog pricing — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let prices: Record<string, unknown>[] = [];
  let catalogItems: { id: string; item_code: string; item_name: string }[] = [];
  let loadError: string | null = null;

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
      title="Catalog pricing"
      moduleLine="Module: Products & Services — Pack 007"
      packNumber={7}
      workspaceName="Products & Services"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <CatalogPriceForm workspace={workspace} catalogItems={catalogItems} />
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
