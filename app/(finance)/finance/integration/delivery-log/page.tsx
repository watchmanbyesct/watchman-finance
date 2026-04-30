/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

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
import { listStagedServiceEventsForTenant, listStagedTimeEntriesForTenant } from "@/lib/integration/pack002-read-queries";

export const metadata = { title: "API idempotency & webhook log — Watchman Finance" };

function statusChip(status: unknown) {
  const value = String(status ?? "unknown").toLowerCase();
  const styleMap: Record<string, string> = {
    pending: "border-amber-700/40 bg-amber-500/10 text-amber-300",
    valid: "border-blue-700/40 bg-blue-500/10 text-blue-300",
    promoted: "border-emerald-700/40 bg-emerald-500/10 text-emerald-300",
    invalid: "border-red-700/40 bg-red-500/10 text-red-300",
  };
  const cls = styleMap[value] ?? "border-white/20 bg-white/5 text-neutral-300";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}>
      {value}
    </span>
  );
}

function webhookStatusChip(status: unknown) {
  const value = String(status ?? "unknown").toLowerCase();
  const styleMap: Record<string, string> = {
    pending: "border-amber-700/40 bg-amber-500/10 text-amber-300",
    sending: "border-blue-700/40 bg-blue-500/10 text-blue-300",
    delivered: "border-emerald-700/40 bg-emerald-500/10 text-emerald-300",
    failed: "border-red-700/40 bg-red-500/10 text-red-300",
    abandoned: "border-purple-700/40 bg-purple-500/10 text-purple-300",
  };
  const cls = styleMap[value] ?? "border-white/20 bg-white/5 text-neutral-300";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}>
      {value}
    </span>
  );
}

function isFailureValidationStatus(status: unknown) {
  const value = String(status ?? "").toLowerCase();
  return value === "invalid" || value === "failed" || value === "error" || value === "rejected";
}

function isFailureWebhookStatus(status: unknown) {
  const value = String(status ?? "").toLowerCase();
  return value === "failed" || value === "abandoned" || value === "error";
}

export default async function Page({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const workspace = await resolveFinanceWorkspace();

  if (!workspace) {
    return (
      <div className="max-w-5xl space-y-6">
        <div>
          <h1 className="wf-page-title">API idempotency & webhook delivery</h1>
          <p className="text-sm text-neutral-500 mt-1">Pack 022 — Diagnostics tables (Pack 023 permission bridge)</p>
        </div>
        <ModuleWorkspaceStatus packNumber={22} workspaceName="Integration diagnostics" />
        <GlSetupRequired />
      </div>
    );
  }

  let keys: Awaited<ReturnType<typeof listFinanceApiIdempotencyKeysForTenant>> = [];
  let webhooks: Awaited<ReturnType<typeof listFinanceWebhookDeliveryLogForTenant>> = [];
  let stagedServiceEvents: Awaited<ReturnType<typeof listStagedServiceEventsForTenant>> = [];
  let stagedTimeEntries: Awaited<ReturnType<typeof listStagedTimeEntriesForTenant>> = [];
  let loadError: string | null = null;
  const showOnlyTimeFailures =
    String(searchParams?.time_failures ?? "").toLowerCase() === "1" ||
    String(searchParams?.time_failures ?? "").toLowerCase() === "true";
  const showOnlyWebhookFailures =
    String(searchParams?.webhook_failures ?? "").toLowerCase() === "1" ||
    String(searchParams?.webhook_failures ?? "").toLowerCase() === "true";
  try {
    [keys, webhooks, stagedServiceEvents, stagedTimeEntries] = await Promise.all([
      listFinanceApiIdempotencyKeysForTenant(workspace.tenantId),
      listFinanceWebhookDeliveryLogForTenant(workspace.tenantId),
      listStagedServiceEventsForTenant(workspace.tenantId),
      listStagedTimeEntriesForTenant(workspace.tenantId),
    ]);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Failed to load delivery diagnostics.";
  }
  const stagedInvoices = stagedServiceEvents.filter((row: any) => row?.service_type === "invoice");
  const invoiceSummary = stagedInvoices.reduce(
    (acc, row: any) => {
      const status = String(row?.validation_status ?? "pending").toLowerCase();
      if (status === "promoted") acc.promoted += 1;
      else if (status === "invalid") acc.invalid += 1;
      else acc.pending += 1;

      const receivedAt = row?.received_at ? new Date(String(row.received_at)).getTime() : null;
      if ((status === "pending" || status === "valid") && receivedAt && Number.isFinite(receivedAt)) {
        if (Date.now() - receivedAt > 24 * 60 * 60 * 1000) acc.stalePending += 1;
      }
      return acc;
    },
    { pending: 0, promoted: 0, invalid: 0, stalePending: 0 },
  );
  const webhookSummary = (webhooks as any[]).reduce(
    (acc, row) => {
      const status = String(row?.delivery_status ?? "pending").toLowerCase();
      if (status === "sending") acc.sending += 1;
      else if (status === "delivered") acc.delivered += 1;
      else if (status === "failed") acc.failed += 1;
      else if (status === "abandoned") acc.abandoned += 1;
      else acc.pending += 1;
      return acc;
    },
    { pending: 0, sending: 0, delivered: 0, failed: 0, abandoned: 0 },
  );
  const timeSummary = (stagedTimeEntries as any[]).reduce(
    (acc, row) => {
      const validation = String(row?.validation_status ?? "pending").toLowerCase();
      if (validation === "promoted") acc.promoted += 1;
      else if (isFailureValidationStatus(validation)) acc.invalid += 1;
      else if (validation === "valid") acc.valid += 1;
      else acc.pending += 1;
      return acc;
    },
    { pending: 0, valid: 0, promoted: 0, invalid: 0 },
  );
  const timeRowsForDisplay = showOnlyTimeFailures
    ? (stagedTimeEntries as any[]).filter((row) => isFailureValidationStatus(row?.validation_status))
    : (stagedTimeEntries as any[]);
  const webhookRowsForDisplay = showOnlyWebhookFailures
    ? (webhooks as any[]).filter((row) => isFailureWebhookStatus(row?.delivery_status))
    : (webhooks as any[]);

  return (
    <WorkflowPageFrame
      title="API idempotency & webhook delivery"
      moduleLine="Pack 022 diagnostics with Pack 023 workflow permission bridge. Tenant-scoped idempotency cache and outbound webhook attempt log."
      packNumber={22}
      workspaceName="Integration diagnostics"
      workspace={workspace}
      loadError={loadError}
    >
      <p className="text-sm text-neutral-500">
        Lists are tenant-wide.{" "}
        <Link href="/finance/integration" className="text-amber-500 hover:text-amber-400">
          Integration hub
        </Link>
        . Use{" "}
        <Link href="/finance/integration/pipeline" className="text-amber-500 hover:text-amber-400">
          event pipeline
        </Link>{" "}
        when diagnostics tables are empty.
      </p>

      <FinanceIntegrationDeliveryForms workspace={workspace} />

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-amber-700/40 bg-amber-500/10 p-3">
          <p className="text-[10px] uppercase tracking-wide text-amber-300/80">Pending</p>
          <p className="mt-1 text-lg font-semibold text-amber-300">{invoiceSummary.pending}</p>
        </div>
        <div className="rounded-lg border border-emerald-700/40 bg-emerald-500/10 p-3">
          <p className="text-[10px] uppercase tracking-wide text-emerald-300/80">Promoted</p>
          <p className="mt-1 text-lg font-semibold text-emerald-300">{invoiceSummary.promoted}</p>
        </div>
        <div className="rounded-lg border border-red-700/40 bg-red-500/10 p-3">
          <p className="text-[10px] uppercase tracking-wide text-red-300/80">Invalid</p>
          <p className="mt-1 text-lg font-semibold text-red-300">{invoiceSummary.invalid}</p>
        </div>
        <div className="rounded-lg border border-purple-700/40 bg-purple-500/10 p-3">
          <p className="text-[10px] uppercase tracking-wide text-purple-300/80">Stale Pending</p>
          <p className="mt-1 text-lg font-semibold text-purple-300">{invoiceSummary.stalePending}</p>
          <p className="mt-1 text-[10px] text-purple-200/70">Older than 24 hours</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <div className="rounded-lg border border-amber-700/40 bg-amber-500/10 p-3">
          <p className="text-[10px] uppercase tracking-wide text-amber-300/80">Webhook Pending</p>
          <p className="mt-1 text-lg font-semibold text-amber-300">{webhookSummary.pending}</p>
        </div>
        <div className="rounded-lg border border-blue-700/40 bg-blue-500/10 p-3">
          <p className="text-[10px] uppercase tracking-wide text-blue-300/80">Webhook Sending</p>
          <p className="mt-1 text-lg font-semibold text-blue-300">{webhookSummary.sending}</p>
        </div>
        <div className="rounded-lg border border-emerald-700/40 bg-emerald-500/10 p-3">
          <p className="text-[10px] uppercase tracking-wide text-emerald-300/80">Webhook Delivered</p>
          <p className="mt-1 text-lg font-semibold text-emerald-300">{webhookSummary.delivered}</p>
        </div>
        <div className="rounded-lg border border-red-700/40 bg-red-500/10 p-3">
          <p className="text-[10px] uppercase tracking-wide text-red-300/80">Webhook Failed</p>
          <p className="mt-1 text-lg font-semibold text-red-300">{webhookSummary.failed}</p>
        </div>
        <div className="rounded-lg border border-purple-700/40 bg-purple-500/10 p-3">
          <p className="text-[10px] uppercase tracking-wide text-purple-300/80">Webhook Abandoned</p>
          <p className="mt-1 text-lg font-semibold text-purple-300">{webhookSummary.abandoned}</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-amber-700/40 bg-amber-500/10 p-3">
          <p className="text-[10px] uppercase tracking-wide text-amber-300/80">Time Pending</p>
          <p className="mt-1 text-lg font-semibold text-amber-300">{timeSummary.pending}</p>
        </div>
        <div className="rounded-lg border border-blue-700/40 bg-blue-500/10 p-3">
          <p className="text-[10px] uppercase tracking-wide text-blue-300/80">Time Valid</p>
          <p className="mt-1 text-lg font-semibold text-blue-300">{timeSummary.valid}</p>
        </div>
        <div className="rounded-lg border border-emerald-700/40 bg-emerald-500/10 p-3">
          <p className="text-[10px] uppercase tracking-wide text-emerald-300/80">Time Promoted</p>
          <p className="mt-1 text-lg font-semibold text-emerald-300">{timeSummary.promoted}</p>
        </div>
        <div className="rounded-lg border border-red-700/40 bg-red-500/10 p-3">
          <p className="text-[10px] uppercase tracking-wide text-red-300/80">Time Failures</p>
          <p className="mt-1 text-lg font-semibold text-red-300">{timeSummary.invalid}</p>
        </div>
      </div>

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
        <div className="mb-3 mt-8 flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-neutral-300">Operations approved-time staging</h2>
          <div className="inline-flex rounded-md border border-white/10 bg-white/[0.02] p-1 text-xs">
            <Link
              href="/finance/integration/delivery-log"
              className={`rounded px-2 py-1 ${!showOnlyTimeFailures ? "bg-white/10 text-white" : "text-neutral-400 hover:text-neutral-200"}`}
            >
              All rows
            </Link>
            <Link
              href="/finance/integration/delivery-log?time_failures=1"
              className={`rounded px-2 py-1 ${showOnlyTimeFailures ? "bg-red-500/20 text-red-300" : "text-neutral-400 hover:text-neutral-200"}`}
            >
              Show only failures
            </Link>
          </div>
        </div>
        <WorkflowDataTable
          columns={[
            { key: "source_record_id", label: "Time source id" },
            { key: "employee_source_record_id", label: "Employee source id" },
            { key: "approval_status", label: "Approval" },
            {
              key: "validation_status",
              label: "Validation",
              render: (row) => statusChip(row.validation_status),
            },
            { key: "pay_period_start", label: "Period start" },
            { key: "pay_period_end", label: "Period end" },
            { key: "received_at", label: "Received" },
          ]}
          rows={timeRowsForDisplay as Record<string, unknown>[]}
          emptyMessage={showOnlyTimeFailures ? "No failed staged time rows." : "No staged approved-time rows yet."}
        />
      </div>

      <div>
        <h2 className="text-sm font-medium text-neutral-300 mb-3 mt-8">Operations invoice staging</h2>
        <WorkflowDataTable
          columns={[
            { key: "source_record_id", label: "Invoice source id" },
            { key: "service_type", label: "Type" },
            {
              key: "validation_status",
              label: "Validation",
              render: (row) => statusChip(row.validation_status),
            },
            { key: "event_date", label: "Event date" },
            { key: "received_at", label: "Received" },
          ]}
          rows={stagedInvoices as Record<string, unknown>[]}
          emptyMessage="No staged Operations invoices yet."
        />
      </div>

      <div>
        <div className="mb-3 mt-8 flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-neutral-300">Webhook delivery log</h2>
          <div className="inline-flex rounded-md border border-white/10 bg-white/[0.02] p-1 text-xs">
            <Link
              href="/finance/integration/delivery-log"
              className={`rounded px-2 py-1 ${!showOnlyWebhookFailures ? "bg-white/10 text-white" : "text-neutral-400 hover:text-neutral-200"}`}
            >
              All rows
            </Link>
            <Link
              href="/finance/integration/delivery-log?webhook_failures=1"
              className={`rounded px-2 py-1 ${showOnlyWebhookFailures ? "bg-red-500/20 text-red-300" : "text-neutral-400 hover:text-neutral-200"}`}
            >
              Show only failures
            </Link>
          </div>
        </div>
        <WorkflowDataTable
          columns={[
            { key: "webhook_key", label: "Webhook" },
            { key: "event_type", label: "Event" },
            { key: "destination_url_host", label: "Host" },
            {
              key: "delivery_status",
              label: "Status",
              render: (row) => webhookStatusChip(row.delivery_status),
            },
            { key: "attempt_count", label: "Attempts" },
            { key: "last_http_status", label: "Last HTTP" },
            {
              key: "last_error",
              label: "Last error",
              render: (row) => {
                const msg = String(row.last_error ?? "—");
                const short = msg.length > 64 ? `${msg.slice(0, 64)}...` : msg;
                return <span title={msg} className="text-xs text-neutral-400">{short}</span>;
              },
            },
            { key: "created_at", label: "Created" },
          ]}
          rows={webhookRowsForDisplay as Record<string, unknown>[]}
          emptyMessage={showOnlyWebhookFailures ? "No failed webhook delivery rows." : "No webhook delivery rows yet."}
        />
      </div>
    </WorkflowPageFrame>
  );
}
