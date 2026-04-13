"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { FinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import type { FiscalPeriod } from "@/types";
import {
  createFinanceApprovalRequest,
  createFinanceEvidenceDocument,
  recordFinanceApiIdempotencyKey,
  recordFinanceWebhookDelivery,
  resolveFinanceApprovalRequest,
  submitFinanceApprovalRequest,
  upsertGlTrialBalanceSnapshot,
} from "@/modules/finance-core/actions/workflow-extensions-actions";

const input =
  "rounded-md border border-white/10 bg-white/5 px-3 py-2 text-neutral-200 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/40";

const EVIDENCE_DOMAINS = [
  "ar",
  "ap",
  "gl",
  "payroll",
  "banking",
  "tax",
  "integration",
  "other",
] as const;

const SUBJECT_DOMAINS = [
  "ar",
  "ap",
  "gl",
  "payroll",
  "banking",
  "tax",
  "catalog",
  "billing",
  "inventory",
  "other",
] as const;

export function FinanceEvidenceWorkflowForm({ workspace }: { workspace: FinanceWorkspace }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [bindEntity, setBindEntity] = useState(true);

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Register evidence metadata</h2>
      <p className="text-xs text-neutral-500 leading-relaxed">
        Records storage location for an object already uploaded to the configured bucket (Pack 019). Requires{" "}
        <code className="text-neutral-400">finance.evidence.document.manage</code>.
      </p>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createFinanceEvidenceDocument({
              tenantId: workspace.tenantId,
              entityId: bindEntity ? workspace.entityId : null,
              domain: String(fd.get("domain") ?? "other") as (typeof EVIDENCE_DOMAINS)[number],
              parentTable: String(fd.get("parentTable") ?? ""),
              parentRecordId: String(fd.get("parentRecordId") ?? ""),
              title: String(fd.get("title") ?? "") || undefined,
              storageBucket: String(fd.get("storageBucket") ?? "finance-evidence"),
              storageObjectPath: String(fd.get("storageObjectPath") ?? ""),
              contentType: String(fd.get("contentType") ?? "") || undefined,
              notes: String(fd.get("notes") ?? "") || undefined,
            });
            setMsg(res.message);
            if (res.success) router.refresh();
          });
        }}
      >
        <label className="flex items-center gap-2 md:col-span-2 text-xs text-neutral-400">
          <input
            type="checkbox"
            checked={bindEntity}
            onChange={() => setBindEntity((v) => !v)}
            className="rounded border-white/20"
          />
          Scope to current entity ({workspace.entityCode})
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Domain</span>
          <select name="domain" className={input}>
            {EVIDENCE_DOMAINS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Parent table</span>
          <input name="parentTable" required className={input} placeholder="e.g. ar_invoices" />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Parent record id (UUID)</span>
          <input name="parentRecordId" required className={input} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Title (optional)</span>
          <input name="title" className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Storage bucket</span>
          <input name="storageBucket" className={input} defaultValue="finance-evidence" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Object path</span>
          <input name="storageObjectPath" required className={input} placeholder="tenant/…/file.pdf" />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Content type (optional)</span>
          <input name="contentType" className={input} placeholder="application/pdf" />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Notes (optional)</span>
          <textarea name="notes" rows={2} className={input} />
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black disabled:opacity-40"
          >
            {pending ? "Saving…" : "Register evidence"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function FinanceApprovalWorkflowForms({ workspace }: { workspace: FinanceWorkspace }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const run = async (fn: () => Promise<{ success: boolean; message: string }>) => {
    setMsg(null);
    const res = await fn();
    setMsg(res.message);
    if (res.success) router.refresh();
  };

  return (
    <div className="space-y-4">
      {msg && <p className="text-xs text-amber-400">{msg}</p>}

      <div className="wf-card space-y-3">
        <h2 className="text-sm font-medium text-neutral-200">Create draft request</h2>
        <form
          className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              let payloadJson: Record<string, unknown> | undefined;
              const raw = String(fd.get("payloadJson") ?? "").trim();
              if (raw) {
                try {
                  payloadJson = JSON.parse(raw) as Record<string, unknown>;
                } catch {
                  setMsg("Payload must be valid JSON.");
                  return;
                }
              }
              await run(() =>
                createFinanceApprovalRequest({
                  tenantId: workspace.tenantId,
                  entityId: workspace.entityId,
                  subjectDomain: String(fd.get("subjectDomain") ?? "other") as (typeof SUBJECT_DOMAINS)[number],
                  subjectTable: String(fd.get("subjectTable") ?? ""),
                  subjectRecordId: String(fd.get("subjectRecordId") ?? ""),
                  requestCode: String(fd.get("requestCode") ?? ""),
                  requestTitle: String(fd.get("requestTitle") ?? ""),
                  priority: String(fd.get("priority") ?? "normal") as "low" | "normal" | "high" | "critical",
                  payloadJson,
                })
              );
            });
          }}
        >
          <label className="flex flex-col gap-1">
            <span className="text-neutral-500 text-xs">Subject domain</span>
            <select name="subjectDomain" className={input}>
              {SUBJECT_DOMAINS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-neutral-500 text-xs">Priority</span>
            <select name="priority" className={input}>
              {(["low", "normal", "high", "critical"] as const).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-neutral-500 text-xs">Subject table</span>
            <input name="subjectTable" required className={input} />
          </label>
          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-neutral-500 text-xs">Subject record id</span>
            <input name="subjectRecordId" required className={input} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-neutral-500 text-xs">Request code</span>
            <input name="requestCode" required className={input} placeholder="INV-VOID-2026-001" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-neutral-500 text-xs">Request title</span>
            <input name="requestTitle" required className={input} />
          </label>
          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-neutral-500 text-xs">Payload JSON (optional)</span>
            <textarea name="payloadJson" rows={3} className={input} placeholder='{"reason":"…"}' />
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black disabled:opacity-40"
            >
              {pending ? "Working…" : "Create draft"}
            </button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="wf-card space-y-3">
          <h2 className="text-sm font-medium text-neutral-200">Submit draft</h2>
          <form
            className="space-y-3 text-sm"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              start(async () => {
                await run(() =>
                  submitFinanceApprovalRequest({
                    tenantId: workspace.tenantId,
                    entityId: workspace.entityId,
                    approvalRequestId: String(fd.get("approvalRequestId") ?? ""),
                  })
                );
              });
            }}
          >
            <label className="flex flex-col gap-1">
              <span className="text-neutral-500 text-xs">Approval request id</span>
              <input name="approvalRequestId" required className={input} />
            </label>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black disabled:opacity-40"
            >
              {pending ? "…" : "Submit"}
            </button>
          </form>
        </div>

        <div className="wf-card space-y-3">
          <h2 className="text-sm font-medium text-neutral-200">Resolve submitted</h2>
          <form
            className="space-y-3 text-sm"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              start(async () => {
                await run(() =>
                  resolveFinanceApprovalRequest({
                    tenantId: workspace.tenantId,
                    entityId: workspace.entityId,
                    approvalRequestId: String(fd.get("approvalRequestId") ?? ""),
                    decision: String(fd.get("decision") ?? "approved") as "approved" | "rejected",
                    resolutionNotes: String(fd.get("resolutionNotes") ?? "") || undefined,
                  })
                );
              });
            }}
          >
            <label className="flex flex-col gap-1">
              <span className="text-neutral-500 text-xs">Approval request id</span>
              <input name="approvalRequestId" required className={input} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-neutral-500 text-xs">Decision</span>
              <select name="decision" className={input}>
                <option value="approved">approved</option>
                <option value="rejected">rejected</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-neutral-500 text-xs">Resolution notes (optional)</span>
              <textarea name="resolutionNotes" rows={2} className={input} />
            </label>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black disabled:opacity-40"
            >
              {pending ? "…" : "Resolve"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export function GlTrialBalanceSnapshotForm({
  workspace,
  fiscalPeriods,
}: {
  workspace: FinanceWorkspace;
  fiscalPeriods: FiscalPeriod[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const defaultJson = '{\n  "sample": true,\n  "note": "Replace with real trial balance payload."\n}';

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Upsert snapshot row</h2>
      <p className="text-xs text-neutral-500 leading-relaxed">
        Balanced totals are required. JSON is stored as snapshot cache (Pack 021). Requires{" "}
        <code className="text-neutral-400">finance.trial_balance.snapshot.manage</code>.
      </p>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const td = Number(fd.get("totalDebit"));
            const tc = Number(fd.get("totalCredit"));
            const res = await upsertGlTrialBalanceSnapshot({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              fiscalPeriodId: String(fd.get("fiscalPeriodId") ?? ""),
              asOfDate: String(fd.get("asOfDate") ?? ""),
              snapshotKind: String(fd.get("snapshotKind") ?? "trial_balance") as
                | "trial_balance"
                | "adjusted_tb"
                | "post_close_tb",
              snapshotStatus: String(fd.get("snapshotStatus") ?? "draft") as "draft" | "final" | "superseded",
              snapshotJsonText: String(fd.get("snapshotJsonText") ?? ""),
              totalDebit: td,
              totalCredit: tc,
              notes: String(fd.get("notes") ?? "") || undefined,
            });
            setMsg(res.message);
            if (res.success) router.refresh();
          });
        }}
      >
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Fiscal period</span>
          <select name="fiscalPeriodId" required className={input} disabled={fiscalPeriods.length === 0}>
            <option value="">{fiscalPeriods.length ? "Select…" : "Create a period first"}</option>
            {fiscalPeriods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.periodName} ({p.startDate} → {p.endDate})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">As-of date</span>
          <input name="asOfDate" type="date" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Snapshot kind</span>
          <select name="snapshotKind" className={input}>
            <option value="trial_balance">trial_balance</option>
            <option value="adjusted_tb">adjusted_tb</option>
            <option value="post_close_tb">post_close_tb</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Status</span>
          <select name="snapshotStatus" className={input}>
            <option value="draft">draft</option>
            <option value="final">final</option>
            <option value="superseded">superseded</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Total debit</span>
          <input name="totalDebit" type="number" step="0.01" min="0" required className={input} defaultValue="0" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Total credit</span>
          <input name="totalCredit" type="number" step="0.01" min="0" required className={input} defaultValue="0" />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Snapshot JSON</span>
          <textarea name="snapshotJsonText" rows={8} required className={input} defaultValue={defaultJson} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Notes (optional)</span>
          <input name="notes" className={input} />
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={pending || fiscalPeriods.length === 0}
            className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black disabled:opacity-40"
          >
            {pending ? "Saving…" : "Upsert snapshot"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function FinanceIntegrationDeliveryForms({ workspace }: { workspace: FinanceWorkspace }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {msg && <p className="text-xs text-amber-400">{msg}</p>}

      <div className="wf-card space-y-3">
        <h2 className="text-sm font-medium text-neutral-200">Record idempotency key</h2>
        <p className="text-xs text-neutral-500">
          Upsert on <code className="text-neutral-400">tenant + idempotency_key + route_key</code> (Pack 022).
        </p>
        <form
          className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              setMsg(null);
              const statusRaw = String(fd.get("responseHttpStatus") ?? "").trim();
              const res = await recordFinanceApiIdempotencyKey({
                tenantId: workspace.tenantId,
                idempotencyKey: String(fd.get("idempotencyKey") ?? ""),
                routeKey: String(fd.get("routeKey") ?? ""),
                requestHash: String(fd.get("requestHash") ?? "") || undefined,
                responseHttpStatus: statusRaw ? Number(statusRaw) : undefined,
                responseBodyJsonText: String(fd.get("responseBodyJsonText") ?? "") || undefined,
                expiresAt: String(fd.get("expiresAt") ?? "") || undefined,
              });
              setMsg(res.message);
              if (res.success) router.refresh();
            });
          }}
        >
          <label className="flex flex-col gap-1">
            <span className="text-neutral-500 text-xs">Idempotency key</span>
            <input name="idempotencyKey" required className={input} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-neutral-500 text-xs">Route key</span>
            <input name="routeKey" required className={input} placeholder="POST /api/finance/…" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-neutral-500 text-xs">Request hash (optional)</span>
            <input name="requestHash" className={input} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-neutral-500 text-xs">HTTP status (optional)</span>
            <input name="responseHttpStatus" type="number" className={input} placeholder="200" />
          </label>
          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-neutral-500 text-xs">Response JSON (optional)</span>
            <textarea name="responseBodyJsonText" rows={3} className={input} placeholder='{"id":"…"}' />
          </label>
          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-neutral-500 text-xs">Expires at (optional, ISO)</span>
            <input name="expiresAt" className={input} />
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black disabled:opacity-40"
            >
              {pending ? "Saving…" : "Upsert key"}
            </button>
          </div>
        </form>
      </div>

      <div className="wf-card space-y-3">
        <h2 className="text-sm font-medium text-neutral-200">Record webhook delivery attempt</h2>
        <form
          className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              setMsg(null);
              const attempt = String(fd.get("attemptCount") ?? "").trim();
              const http = String(fd.get("lastHttpStatus") ?? "").trim();
              const res = await recordFinanceWebhookDelivery({
                tenantId: workspace.tenantId,
                webhookKey: String(fd.get("webhookKey") ?? ""),
                eventType: String(fd.get("eventType") ?? ""),
                destinationUrlHost: String(fd.get("destinationUrlHost") ?? ""),
                payloadDigest: String(fd.get("payloadDigest") ?? "") || undefined,
                deliveryStatus: String(fd.get("deliveryStatus") ?? "pending") as
                  | "pending"
                  | "sending"
                  | "delivered"
                  | "failed"
                  | "abandoned",
                attemptCount: attempt ? Number(attempt) : undefined,
                lastHttpStatus: http ? Number(http) : undefined,
                lastError: String(fd.get("lastError") ?? "") || undefined,
                nextRetryAt: String(fd.get("nextRetryAt") ?? "") || undefined,
              });
              setMsg(res.message);
              if (res.success) router.refresh();
            });
          }}
        >
          <label className="flex flex-col gap-1">
            <span className="text-neutral-500 text-xs">Webhook key</span>
            <input name="webhookKey" required className={input} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-neutral-500 text-xs">Event type</span>
            <input name="eventType" required className={input} />
          </label>
          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-neutral-500 text-xs">Destination host</span>
            <input name="destinationUrlHost" required className={input} placeholder="hooks.partner.com" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-neutral-500 text-xs">Delivery status</span>
            <select name="deliveryStatus" className={input}>
              {(["pending", "sending", "delivered", "failed", "abandoned"] as const).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-neutral-500 text-xs">Attempt count</span>
            <input name="attemptCount" type="number" min="0" className={input} placeholder="0" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-neutral-500 text-xs">Last HTTP status</span>
            <input name="lastHttpStatus" type="number" className={input} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-neutral-500 text-xs">Payload digest (optional)</span>
            <input name="payloadDigest" className={input} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-neutral-500 text-xs">Next retry (optional, ISO)</span>
            <input name="nextRetryAt" className={input} />
          </label>
          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-neutral-500 text-xs">Last error (optional)</span>
            <textarea name="lastError" rows={2} className={input} />
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black disabled:opacity-40"
            >
              {pending ? "Saving…" : "Insert delivery row"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
