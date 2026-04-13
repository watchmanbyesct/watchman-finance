import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { InventoryStockReceiptForm } from "@/components/finance/connected/catalog-billing-inventory-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import {
  listInventoryItemsForTenant,
  listInventoryLocationsForTenant,
  listInventoryStockBalancesForTenant,
} from "@/lib/finance/read-queries";

export const metadata = { title: "Stock balances — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let items: { id: string; item_code: string; item_name: string }[] = [];
  let locations: { id: string; location_code: string; location_name: string }[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      const [bal, it, loc] = await Promise.all([
        listInventoryStockBalancesForTenant(workspace.tenantId),
        listInventoryItemsForTenant(workspace.tenantId),
        listInventoryLocationsForTenant(workspace.tenantId),
      ]);
      rows = bal as Record<string, unknown>[];
      items = it as typeof items;
      locations = loc as typeof locations;
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load stock balances.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Stock balances"
      moduleLine="Module: Inventory & Assets — Pack 008"
      packNumber={8}
      workspaceName="Inventory & Assets"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <div className="space-y-6">
          <InventoryStockReceiptForm workspace={workspace} items={items} locations={locations} />
          <div>
          <p className="text-sm text-neutral-500 mb-4">
            On-hand quantities by item and location. Use receive stock above to increment balances; formal receipt
            documents can be layered on later.
          </p>
          <WorkflowDataTable
            columns={[
              { key: "inventory_item_id", label: "Item id" },
              { key: "inventory_location_id", label: "Location id" },
              { key: "quantity_on_hand", label: "On hand" },
              { key: "quantity_available", label: "Available" },
              { key: "total_value", label: "Value" },
            ]}
            rows={rows}
          />
          </div>
        </div>
      )}
    </WorkflowPageFrame>
  );
}
