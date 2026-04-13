import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import {
  InventoryCategoryForm,
  InventoryItemForm,
  InventoryLocationForm,
} from "@/components/finance/connected/catalog-billing-inventory-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import {
  listInventoryCategoriesForTenant,
  listInventoryItemsForTenant,
  listInventoryLocationsForTenant,
} from "@/lib/finance/read-queries";

export const metadata = { title: "Inventory items — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let items: Record<string, unknown>[] = [];
  let categories: Record<string, unknown>[] = [];
  let locations: Record<string, unknown>[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      const [it, cat, loc] = await Promise.all([
        listInventoryItemsForTenant(workspace.tenantId),
        listInventoryCategoriesForTenant(workspace.tenantId),
        listInventoryLocationsForTenant(workspace.tenantId),
      ]);
      items = it as Record<string, unknown>[];
      categories = cat as Record<string, unknown>[];
      locations = loc as Record<string, unknown>[];
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load inventory master data.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Inventory items"
      moduleLine="Module: Inventory & Assets — Pack 008 schema; Pack 013 permissions (category, location, item)"
      packNumber={8}
      workspaceName="Inventory & Assets"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <InventoryCategoryForm workspace={workspace} />
          <InventoryLocationForm workspace={workspace} />
          <InventoryItemForm workspace={workspace} />
          <div className="mt-6 space-y-6">
            <div>
              <h2 className="text-sm font-medium text-neutral-300 mb-3">Categories</h2>
              <WorkflowDataTable
                columns={[
                  { key: "category_code", label: "Code" },
                  { key: "category_name", label: "Name" },
                  { key: "category_type", label: "Type" },
                  { key: "status", label: "Status" },
                ]}
                rows={categories}
              />
            </div>
            <div>
              <h2 className="text-sm font-medium text-neutral-300 mb-3">Locations (active)</h2>
              <WorkflowDataTable
                columns={[
                  { key: "location_code", label: "Code" },
                  { key: "location_name", label: "Name" },
                  { key: "entity_id", label: "Entity" },
                ]}
                rows={locations}
              />
            </div>
            <div>
              <h2 className="text-sm font-medium text-neutral-300 mb-3">Items</h2>
              <WorkflowDataTable
                columns={[
                  { key: "item_code", label: "Code" },
                  { key: "item_name", label: "Name" },
                  { key: "tracking_mode", label: "Tracking" },
                  { key: "is_active", label: "Active" },
                ]}
                rows={items}
              />
            </div>
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
