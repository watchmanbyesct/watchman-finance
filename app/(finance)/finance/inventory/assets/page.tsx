import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { RegisterEquipmentAssetForm } from "@/components/finance/connected/catalog-billing-inventory-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listEquipmentAssetsForTenant, listInventoryItemsForTenant } from "@/lib/finance/read-queries";

export const metadata = { title: "Equipment assets — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let items: { id: string; item_code: string; item_name: string }[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      const [ast, it] = await Promise.all([
        listEquipmentAssetsForTenant(workspace.tenantId),
        listInventoryItemsForTenant(workspace.tenantId),
      ]);
      rows = ast as Record<string, unknown>[];
      items = it as typeof items;
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load assets.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Equipment assets"
      moduleLine="Module: Inventory & Assets — Pack 008"
      packNumber={8}
      workspaceName="Inventory & Assets"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <div className="space-y-6">
          <RegisterEquipmentAssetForm workspace={workspace} items={items} />
          <WorkflowDataTable
          columns={[
            { key: "asset_tag", label: "Tag" },
            { key: "asset_name", label: "Name" },
            { key: "asset_status", label: "Status" },
          ]}
          rows={rows}
        />
        </div>
      )}
    </WorkflowPageFrame>
  );
}
