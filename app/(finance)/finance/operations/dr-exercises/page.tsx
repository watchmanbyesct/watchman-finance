import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { DisasterRecoveryExerciseForm } from "@/components/finance/connected/reporting-planning-consolidation-ops-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { listDisasterRecoveryExercisesForTenant } from "@/lib/finance/read-queries";

export const metadata = { title: "DR exercises — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let rows: Record<string, unknown>[] = [];
  let loadError: string | null = null;

  if (workspace) {
    try {
      rows = (await listDisasterRecoveryExercisesForTenant(workspace.tenantId)) as Record<string, unknown>[];
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load DR exercises.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Disaster recovery exercises"
      moduleLine="Module: Operations & QA — Pack 012"
      packNumber={12}
      workspaceName="Operations & QA"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <DisasterRecoveryExerciseForm workspace={workspace} />
          <div className="mt-6">
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Exercises</h2>
            <WorkflowDataTable
              columns={[
                { key: "exercise_name", label: "Name" },
                { key: "exercise_scope", label: "Scope" },
                { key: "exercise_status", label: "Status" },
                { key: "exercise_date", label: "Date" },
              ]}
              rows={rows}
            />
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
