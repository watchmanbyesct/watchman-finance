"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { FinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import {
  promoteStagedEmployee,
  stageManualStagedEmployee,
  stageManualStagedServiceEvent,
  stageManualStagedTimeEntry,
} from "@/modules/integration/actions/integration-actions";
import { createBranch, createDepartment, createLocation } from "@/modules/integration/actions/org-structure-actions";

const input =
  "rounded-md border border-white/10 bg-white/5 px-3 py-2 text-neutral-200 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/40";

type StagedEmp = { id: string; source_record_id: string; validation_status: string };

export function Pack002StageEmployeeForm({ workspace }: { workspace: FinanceWorkspace }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Stage employee (Launch shape)</h2>
      <p className="text-xs text-neutral-500">
        Creates or updates a <code className="text-neutral-400">staged_employees</code> row. Use a stable external{" "}
        <code className="text-neutral-400">source_record_id</code> per person.
      </p>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await stageManualStagedEmployee({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              sourceRecordId: String(fd.get("sourceRecordId") ?? "").trim(),
              legalFirstName: String(fd.get("legalFirstName") ?? "").trim(),
              legalLastName: String(fd.get("legalLastName") ?? "").trim(),
              email: String(fd.get("email") ?? "").trim() || undefined,
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
          <span className="text-neutral-500 text-xs">Source record id</span>
          <input name="sourceRecordId" required className={input} placeholder="launch-emp-001" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Legal first name</span>
          <input name="legalFirstName" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Legal last name</span>
          <input name="legalLastName" required className={input} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Email (optional)</span>
          <input name="email" type="email" className={input} />
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
          >
            {pending ? "Staging…" : "Stage employee"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function Pack002PromoteEmployeeForm({
  workspace,
  stagedRows,
}: {
  workspace: FinanceWorkspace;
  stagedRows: StagedEmp[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const promotable = stagedRows.filter((r) => r.validation_status !== "promoted");

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Promote to finance_people</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid gap-3 text-sm max-w-xl"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await promoteStagedEmployee({
              tenantId: workspace.tenantId,
              stagedEmployeeId: String(fd.get("stagedEmployeeId") ?? ""),
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
          <span className="text-neutral-500 text-xs">Staged row</span>
          <select name="stagedEmployeeId" required className={input}>
            <option value="">Select…</option>
            {promotable.map((r) => (
              <option key={r.id} value={r.id}>
                {r.source_record_id} — {r.validation_status}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={pending || !promotable.length}
          className="rounded-md bg-emerald-700/90 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Promoting…" : "Promote"}
        </button>
      </form>
    </div>
  );
}

export function Pack002StageTimeForm({ workspace }: { workspace: FinanceWorkspace }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Stage approved time</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await stageManualStagedTimeEntry({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              sourceRecordId: String(fd.get("sourceRecordId") ?? "").trim(),
              employeeSourceRecordId: String(fd.get("employeeSourceRecordId") ?? "").trim(),
              payPeriodStart: String(fd.get("payPeriodStart") ?? "").trim() || undefined,
              payPeriodEnd: String(fd.get("payPeriodEnd") ?? "").trim() || undefined,
              regularHours: Number(fd.get("regularHours") ?? 0) || 0,
              overtimeHours: Number(fd.get("overtimeHours") ?? 0) || 0,
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
          <span className="text-neutral-500 text-xs">Time entry source id</span>
          <input name="sourceRecordId" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Employee source id</span>
          <input name="employeeSourceRecordId" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Pay period start</span>
          <input name="payPeriodStart" type="date" className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Pay period end</span>
          <input name="payPeriodEnd" type="date" className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Regular hours</span>
          <input name="regularHours" type="number" step="0.25" min={0} defaultValue={0} className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Overtime hours</span>
          <input name="overtimeHours" type="number" step="0.25" min={0} defaultValue={0} className={input} />
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
            {pending ? "Staging…" : "Stage time entry"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function Pack002StageServiceEventForm({ workspace }: { workspace: FinanceWorkspace }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Stage service event</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await stageManualStagedServiceEvent({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              sourceRecordId: String(fd.get("sourceRecordId") ?? "").trim(),
              serviceType: String(fd.get("serviceType") ?? "").trim(),
              eventDate: String(fd.get("eventDate") ?? "").trim() || undefined,
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
          <span className="text-neutral-500 text-xs">Source record id</span>
          <input name="sourceRecordId" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Service type</span>
          <input name="serviceType" required className={input} placeholder="guard_visit" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Event date</span>
          <input name="eventDate" type="date" className={input} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Notes (optional)</span>
          <input name="notes" className={input} />
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
            {pending ? "Staging…" : "Stage event"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function Pack002CreateBranchForm({ workspace }: { workspace: FinanceWorkspace }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Add branch</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createBranch({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              code: String(fd.get("code") ?? "").trim(),
              name: String(fd.get("name") ?? "").trim(),
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
          <input name="code" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Name</span>
          <input name="name" required className={input} />
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
            {pending ? "Saving…" : "Create branch"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function Pack002CreateDepartmentForm({ workspace }: { workspace: FinanceWorkspace }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Add department</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createDepartment({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              code: String(fd.get("code") ?? "").trim(),
              name: String(fd.get("name") ?? "").trim(),
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
          <input name="code" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Name</span>
          <input name="name" required className={input} />
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
            {pending ? "Saving…" : "Create department"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function Pack002CreateLocationForm({
  workspace,
  branches,
}: {
  workspace: FinanceWorkspace;
  branches: { id: string; code: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Add location</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const branchRaw = String(fd.get("branchId") ?? "").trim();
            const res = await createLocation({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              branchId: branchRaw ? branchRaw : null,
              name: String(fd.get("name") ?? "").trim(),
              locationType: String(fd.get("locationType") ?? "").trim() || undefined,
              city: String(fd.get("city") ?? "").trim() || undefined,
              state: String(fd.get("state") ?? "").trim() || undefined,
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
          <span className="text-neutral-500 text-xs">Branch (optional)</span>
          <select name="branchId" className={input}>
            <option value="">—</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code} — {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Location name</span>
          <input name="name" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Type (optional)</span>
          <input name="locationType" className={input} placeholder="warehouse" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">City</span>
          <input name="city" className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">State</span>
          <input name="state" className={input} />
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
            {pending ? "Saving…" : "Create location"}
          </button>
        </div>
      </form>
    </div>
  );
}
