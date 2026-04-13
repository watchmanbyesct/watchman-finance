"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { FinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import {
  completeIntegrationSyncRun,
  createIntegrationSyncRun,
  markIntegrationEventProcessingStatus,
  upsertIntegrationSyncJob,
} from "@/modules/integration/actions/integration-pipeline-actions";

const input =
  "rounded-md border border-white/10 bg-white/5 px-3 py-2 text-neutral-200 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/40";

type JobRow = { id: string; job_key: string; source_system_key: string; target_domain: string };

export function IntegrationSyncJobUpsertForm({ workspace }: { workspace: FinanceWorkspace }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="wf-card space-y-3">
      <h3 className="text-sm font-medium text-neutral-200">Upsert sync job</h3>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await upsertIntegrationSyncJob({
              tenantId: workspace.tenantId,
              jobKey: String(fd.get("jobKey") ?? "").trim(),
              sourceSystemKey: String(fd.get("sourceSystemKey") ?? "").trim(),
              targetDomain: String(fd.get("targetDomain") ?? "").trim(),
              scheduleMode: String(fd.get("scheduleMode") ?? "manual") as "manual" | "scheduled" | "event_driven",
              status: String(fd.get("status") ?? "active") as "active" | "paused" | "inactive",
            });
            setMsg(res.message);
            if (res.success) (e.target as HTMLFormElement).reset();
            router.refresh();
          });
        }}
      >
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Job key</span>
          <input name="jobKey" required className={input} placeholder="ar_nightly_pull" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Source system</span>
          <input name="sourceSystemKey" required className={input} defaultValue="watchman_finance" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Target domain</span>
          <input name="targetDomain" required className={input} placeholder="ar" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Schedule mode</span>
          <select name="scheduleMode" className={input}>
            <option value="manual">manual</option>
            <option value="scheduled">scheduled</option>
            <option value="event_driven">event_driven</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Status</span>
          <select name="status" className={input}>
            <option value="active">active</option>
            <option value="paused">paused</option>
            <option value="inactive">inactive</option>
          </select>
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
            {pending ? "Saving…" : "Save job"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function IntegrationSyncRunStartForm({
  workspace,
  jobs,
}: {
  workspace: FinanceWorkspace;
  jobs: JobRow[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  if (!jobs.length) return null;
  return (
    <div className="wf-card space-y-3">
      <h3 className="text-sm font-medium text-neutral-200">Start sync run</h3>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="flex flex-wrap gap-3 items-end text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createIntegrationSyncRun({
              tenantId: workspace.tenantId,
              syncJobId: String(fd.get("syncJobId") ?? ""),
            });
            setMsg(res.message);
            router.refresh();
          });
        }}
      >
        <label className="flex flex-col gap-1 min-w-[200px]">
          <span className="text-neutral-500 text-xs">Job</span>
          <select name="syncJobId" required className={input}>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.job_key} ({j.target_domain})
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={pending} className="rounded-md bg-white/10 px-4 py-2 text-sm text-neutral-200">
          {pending ? "Starting…" : "Start run"}
        </button>
      </form>
    </div>
  );
}

export function IntegrationSyncRunCompleteForm({ workspace }: { workspace: FinanceWorkspace }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="wf-card space-y-3">
      <h3 className="text-sm font-medium text-neutral-200">Complete sync run</h3>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await completeIntegrationSyncRun({
              tenantId: workspace.tenantId,
              syncRunId: String(fd.get("syncRunId") ?? "").trim(),
              runStatus: String(fd.get("runStatus") ?? "completed") as "completed" | "failed" | "partial",
              recordsReceived: Number(fd.get("recordsReceived") ?? 0) || undefined,
              recordsPromoted: Number(fd.get("recordsPromoted") ?? 0) || undefined,
              recordsFailed: Number(fd.get("recordsFailed") ?? 0) || undefined,
              errorSummary: String(fd.get("errorSummary") ?? "").trim() || undefined,
            });
            setMsg(res.message);
            router.refresh();
          });
        }}
      >
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Sync run ID</span>
          <input name="syncRunId" required className={input} placeholder="uuid" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Outcome</span>
          <select name="runStatus" className={input}>
            <option value="completed">completed</option>
            <option value="partial">partial</option>
            <option value="failed">failed</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Records received</span>
          <input name="recordsReceived" type="number" min={0} className={input} defaultValue={0} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Records promoted</span>
          <input name="recordsPromoted" type="number" min={0} className={input} defaultValue={0} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Records failed</span>
          <input name="recordsFailed" type="number" min={0} className={input} defaultValue={0} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Error summary (optional)</span>
          <input name="errorSummary" className={input} />
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending} className="rounded-md bg-white/10 px-4 py-2 text-sm text-neutral-200">
            {pending ? "Updating…" : "Close run"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function IntegrationEventDispositionForm({ workspace }: { workspace: FinanceWorkspace }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="wf-card space-y-3">
      <h3 className="text-sm font-medium text-neutral-200">Event disposition</h3>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await markIntegrationEventProcessingStatus({
              tenantId: workspace.tenantId,
              eventId: String(fd.get("eventId") ?? "").trim(),
              processingStatus: String(fd.get("processingStatus") ?? "ignored") as
                | "received"
                | "validated"
                | "promoted"
                | "failed"
                | "ignored",
              errorMessage: String(fd.get("errorMessage") ?? "").trim() || undefined,
            });
            setMsg(res.message);
            router.refresh();
          });
        }}
      >
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Event log ID</span>
          <input name="eventId" required className={input} placeholder="uuid from table" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Status</span>
          <select name="processingStatus" className={input}>
            <option value="validated">validated</option>
            <option value="promoted">promoted</option>
            <option value="failed">failed</option>
            <option value="ignored">ignored</option>
            <option value="received">received</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Error message (optional)</span>
          <input name="errorMessage" className={input} />
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending} className="rounded-md bg-white/10 px-4 py-2 text-sm text-neutral-200">
            {pending ? "Saving…" : "Update event"}
          </button>
        </div>
      </form>
    </div>
  );
}
