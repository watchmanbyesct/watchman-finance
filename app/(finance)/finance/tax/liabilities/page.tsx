import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { TaxLiabilityForm } from "@/components/finance/connected/tax-workflow-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listTaxJurisdictionsForTenant, listTaxLiabilitiesForEntity } from "@/lib/finance/read-queries";

export const metadata = { title: "Tax liabilities — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let jurisdictions: { id: string; jurisdiction_code: string; jurisdiction_name: string }[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      const [liab, jur] = await Promise.all([
        listTaxLiabilitiesForEntity(workspace.tenantId, workspace.entityId),
        listTaxJurisdictionsForTenant(workspace.tenantId),
      ]);
      rows = liab as Record<string, unknown>[];
      jurisdictions = jur as typeof jurisdictions;
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load liabilities.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Tax liabilities"
      moduleLine="Module: Tax — Packs 014–015 (schema + permissions)"
      packNumber={15}
      workspaceName="Tax"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <TaxLiabilityForm workspace={workspace} jurisdictions={jurisdictions} />
          <div className="mt-6">
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Liabilities</h2>
            <WorkflowDataTable
              columns={[
                { key: "liability_code", label: "Code" },
                { key: "amount", label: "Amount" },
                { key: "as_of_date", label: "As of" },
                { key: "liability_status", label: "Status" },
              ]}
              rows={rows}
            />
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
