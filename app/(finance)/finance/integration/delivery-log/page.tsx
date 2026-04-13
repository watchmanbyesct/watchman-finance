import Link from "next/link";
import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import { FinanceIntegrationDeliveryForms } from "@/components/finance/connected/workflow-extensions-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { ModuleWorkspaceStatus } from "@/components/finance/module-workspace-status";
import { GlSetupRequired } from "@/components/finance/gl/gl-setup-required";
import {
  listFinanceApiIdempotencyKeysForTenant,
  listFinanceWebhookDeliveryLogForTenant,
} from "@/lib/finance/read-queries";

export const metadata = { title: "API idempotency & webhook log — Watchman Finance" };

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();

  if (!workspace) {
    return (
      <div className="max-w-5xl space-y-6">
        <div>
          <h1 className="wf-page-title">API idempotency & webhook delivery</h1>
          <p className="text-sm text-neutral-500 mt-1">Pack 022 — Diagnostics tables</p>
        </div>
        <ModuleWorkspaceStatus packNumber={23} workspaceName="Integration" />
        <GlSetupRequired />
      </div>
    );
  }

  let keys: Awaited<ReturnType<typeof listFinanceApiIdempotencyKeysForTenant>> = [];
  let webhooks: Awaited<ReturnType<typeof listFinanceWebhookDeliveryLogForTenant>> = [];
  let loadError: string | null = null;
  try {
    [keys, webhooks] = await Promise.all([
      listFinanceApiIdempotencyKeysForTenant(workspace.tenantId),
      listFinanceWebhookDeliveryLogForTenant(workspace.tenantId),
    ]);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Failed to load delivery diagnostics.";
  }

  return (
    <WorkflowPageFrame
      title="API idempotency & webhook delivery"
      moduleLine="Pack 022 — Tenant-scoped idempotency cache and outbound webhook attempt log (operator test rows + future automation)."
      packNumber={23}
      workspaceName="Integration"
      workspace={workspace}
      loadError={loadError}
    >
      <p className="text-sm text-neutral-500">
        Lists are tenant-wide.{" "}
        <Link href="/finance/integration" className="text-amber-500 hover:text-amber-400">
          Integration hub
        </Link>
        .
      </p>

      <FinanceIntegrationDeliveryForms workspace={workspace} />

      <div>
        <h2 className="text-sm font-medium text-neutral-300 mb-3">Idempotency keys</h2>
        <WorkflowDataTable
          columns={[
            { key: "route_key", label: "Route" },
            { key: "idempotency_key", label: "Key" },
            { key: "response_http_status", label: "HTTP" },
            { key: "created_at", label: "Created" },
          ]}
          rows={keys as Record<string, unknown>[]}
          emptyMessage="No idempotency rows yet."
        />
      </div>

      <div>
        <h2 className="text-sm font-medium text-neutral-300 mb-3 mt-8">Webhook delivery log</h2>
        <WorkflowDataTable
          columns={[
            { key: "webhook_key", label: "Webhook" },
            { key: "event_type", label: "Event" },
            { key: "destination_url_host", label: "Host" },
            { key: "delivery_status", label: "Status" },
            { key: "attempt_count", label: "Attempts" },
            { key: "last_http_status", label: "Last HTTP" },
            { key: "created_at", label: "Created" },
          ]}
          rows={webhooks as Record<string, unknown>[]}
          emptyMessage="No webhook delivery rows yet."
        />
      </div>
    </WorkflowPageFrame>
  );
}
