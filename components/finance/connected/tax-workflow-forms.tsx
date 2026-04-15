/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { FinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import {
  createDirectDepositBatch,
  createDirectDepositBatchItem,
  createTaxComplianceTask,
  createTaxEmployerProfile,
  createTaxFilingPeriod,
  createTaxJurisdiction,
  createTaxLiability,
} from "@/modules/tax/actions/tax-actions";

const input =
  "rounded-md border border-white/10 bg-white/5 px-3 py-2 text-neutral-200 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/40";

type Jur = { id: string; jurisdiction_code: string; jurisdiction_name: string };

export function TaxJurisdictionForm({ workspace }: { workspace: FinanceWorkspace }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Add tax jurisdiction</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createTaxJurisdiction({
              tenantId: workspace.tenantId,
              jurisdictionCode: String(fd.get("jurisdictionCode") ?? "").trim(),
              jurisdictionName: String(fd.get("jurisdictionName") ?? "").trim(),
              countryCode: String(fd.get("countryCode") ?? "US").toUpperCase().slice(0, 2) || "US",
            });
            setMsg(res.message);
            if (res.success) {
              (e.target as HTMLFormElement).reset();
              router.refresh();
            }
          });
        }}
      >
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Code</span>
          <input name="jurisdictionCode" required className={input} placeholder="US-FED" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Name</span>
          <input name="jurisdictionName" required className={input} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Country (ISO-2)</span>
          <input name="countryCode" maxLength={2} defaultValue="US" className={input} />
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
            {pending ? "Saving…" : "Create jurisdiction"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function TaxEmployerProfileForm({ workspace, jurisdictions }: { workspace: FinanceWorkspace; jurisdictions: Jur[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Add employer tax profile</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createTaxEmployerProfile({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              taxJurisdictionId: String(fd.get("taxJurisdictionId") ?? ""),
              registrationReference: String(fd.get("registrationReference") ?? "").trim() || undefined,
              profileStatus: String(fd.get("profileStatus") ?? "draft") as "draft" | "active" | "inactive",
              effectiveDate: String(fd.get("effectiveDate") ?? "").trim() || undefined,
              notes: String(fd.get("notes") ?? "").trim() || undefined,
            });
            setMsg(res.message);
            if (res.success) {
              (e.target as HTMLFormElement).reset();
              router.refresh();
            }
          });
        }}
      >
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Jurisdiction</span>
          <select name="taxJurisdictionId" required className={input}>
            <option value="">Select…</option>
            {jurisdictions.map((j) => (
              <option key={j.id} value={j.id}>
                {j.jurisdiction_code} — {j.jurisdiction_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Registration ref</span>
          <input name="registrationReference" className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Status</span>
          <select name="profileStatus" className={input}>
            <option value="draft">draft</option>
            <option value="active">active</option>
            <option value="inactive">inactive</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Effective date</span>
          <input name="effectiveDate" type="date" className={input} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Notes</span>
          <input name="notes" className={input} />
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending || !jurisdictions.length} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
            {pending ? "Saving…" : "Save profile"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function TaxLiabilityForm({ workspace, jurisdictions }: { workspace: FinanceWorkspace; jurisdictions: Jur[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Record tax liability</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const jur = String(fd.get("taxJurisdictionId") ?? "").trim();
            const res = await createTaxLiability({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              taxJurisdictionId: jur || undefined,
              liabilityCode: String(fd.get("liabilityCode") ?? "").trim(),
              description: String(fd.get("description") ?? "").trim() || undefined,
              amount: Number(fd.get("amount") ?? 0),
              asOfDate: String(fd.get("asOfDate") ?? ""),
            });
            setMsg(res.message);
            if (res.success) {
              (e.target as HTMLFormElement).reset();
              router.refresh();
            }
          });
        }}
      >
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Jurisdiction (optional)</span>
          <select name="taxJurisdictionId" className={input}>
            <option value="">—</option>
            {jurisdictions.map((j) => (
              <option key={j.id} value={j.id}>
                {j.jurisdiction_code}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Liability code</span>
          <input name="liabilityCode" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Amount</span>
          <input name="amount" type="number" step="0.01" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">As of date</span>
          <input name="asOfDate" type="date" required className={input} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Description</span>
          <input name="description" className={input} />
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
            {pending ? "Saving…" : "Record liability"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function TaxFilingPeriodForm({ workspace, jurisdictions }: { workspace: FinanceWorkspace; jurisdictions: Jur[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Add filing period</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createTaxFilingPeriod({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              taxJurisdictionId: String(fd.get("taxJurisdictionId") ?? ""),
              periodCode: String(fd.get("periodCode") ?? "").trim(),
              periodStart: String(fd.get("periodStart") ?? ""),
              periodEnd: String(fd.get("periodEnd") ?? ""),
              filingDueDate: String(fd.get("filingDueDate") ?? "").trim() || undefined,
            });
            setMsg(res.message);
            if (res.success) {
              (e.target as HTMLFormElement).reset();
              router.refresh();
            }
          });
        }}
      >
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Jurisdiction</span>
          <select name="taxJurisdictionId" required className={input}>
            <option value="">Select…</option>
            {jurisdictions.map((j) => (
              <option key={j.id} value={j.id}>
                {j.jurisdiction_code}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Period code</span>
          <input name="periodCode" required className={input} placeholder="2026-Q1" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Period start</span>
          <input name="periodStart" type="date" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Period end</span>
          <input name="periodEnd" type="date" required className={input} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Filing due date</span>
          <input name="filingDueDate" type="date" className={input} />
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending || !jurisdictions.length} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
            {pending ? "Saving…" : "Save period"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function TaxComplianceTaskForm({ workspace }: { workspace: FinanceWorkspace }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Add compliance task</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createTaxComplianceTask({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              taskCode: String(fd.get("taskCode") ?? "").trim(),
              taskName: String(fd.get("taskName") ?? "").trim(),
              dueDate: String(fd.get("dueDate") ?? "").trim() || undefined,
            });
            setMsg(res.message);
            if (res.success) {
              (e.target as HTMLFormElement).reset();
              router.refresh();
            }
          });
        }}
      >
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Task code</span>
          <input name="taskCode" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Task name</span>
          <input name="taskName" required className={input} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Due date</span>
          <input name="dueDate" type="date" className={input} />
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
            {pending ? "Saving…" : "Create task"}
          </button>
        </div>
      </form>
    </div>
  );
}

type BatchRow = { id: string; batch_status: string; created_at: string };
type PayProf = { id: string; employee_number: string | null };

export function DirectDepositBatchForm({
  workspace,
  payrollRuns,
}: {
  workspace: FinanceWorkspace;
  payrollRuns: { id: string; run_number: string; run_status: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Create direct deposit batch</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const pr = String(fd.get("payrollRunId") ?? "").trim();
            const res = await createDirectDepositBatch({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              payrollRunId: pr || undefined,
              notes: String(fd.get("notes") ?? "").trim() || undefined,
            });
            setMsg(res.message);
            if (res.success) {
              (e.target as HTMLFormElement).reset();
              router.refresh();
            }
          });
        }}
      >
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Payroll run (optional)</span>
          <select name="payrollRunId" className={input}>
            <option value="">None</option>
            {payrollRuns.map((r) => (
              <option key={r.id} value={r.id}>
                {r.run_number} ({r.run_status})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Notes</span>
          <input name="notes" className={input} />
        </label>
        <button type="submit" disabled={pending} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black w-fit">
          {pending ? "Saving…" : "Create batch"}
        </button>
      </form>
    </div>
  );
}

export function DirectDepositBatchItemForm({
  workspace,
  batches,
  payProfiles,
}: {
  workspace: FinanceWorkspace;
  batches: BatchRow[];
  payProfiles: PayProf[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Add line to deposit batch</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createDirectDepositBatchItem({
              tenantId: workspace.tenantId,
              directDepositBatchId: String(fd.get("directDepositBatchId") ?? ""),
              employeePayProfileId: String(fd.get("employeePayProfileId") ?? ""),
              amount: Number(fd.get("amount") ?? 0),
              traceReference: String(fd.get("traceReference") ?? "").trim() || undefined,
            });
            setMsg(res.message);
            if (res.success) {
              (e.target as HTMLFormElement).reset();
              router.refresh();
            }
          });
        }}
      >
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Batch</span>
          <select name="directDepositBatchId" required className={input}>
            <option value="">Select…</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.id.slice(0, 8)}… · {b.batch_status}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Employee pay profile</span>
          <select name="employeePayProfileId" required className={input}>
            <option value="">Select…</option>
            {payProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.employee_number ?? p.id.slice(0, 8)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Amount</span>
          <input name="amount" type="number" step="0.01" min={0.01} required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Trace ref</span>
          <input name="traceReference" className={input} />
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending || !batches.length || !payProfiles.length} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
            {pending ? "Saving…" : "Add line"}
          </button>
        </div>
      </form>
    </div>
  );
}
