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
  approveLeaveRequest,
  assignLeavePolicy,
  createLeavePolicy,
  createLeaveType,
  runLeaveAccruals,
  submitLeaveRequest,
} from "@/modules/leave/actions/leave-actions";

const input =
  "rounded-md border border-white/10 bg-white/5 px-3 py-2 text-neutral-200 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/40";

const LEAVE_CATEGORIES = [
  "sick",
  "vacation",
  "personal",
  "pto",
  "holiday",
  "bereavement",
  "jury_duty",
  "administrative",
  "training",
  "unpaid",
  "other",
] as const;

const ACCRUAL_METHODS = [
  "hours_worked",
  "per_pay_period",
  "monthly",
  "anniversary",
  "fixed_annual",
  "front_loaded",
] as const;

type Lt = { id: string; leave_code: string; leave_name: string };
type Lp = { id: string; policy_code: string; policy_name: string };
type PersonRow = { id: string; legal_first_name: string; legal_last_name: string };

export function LeaveTypeCreateForm({ workspace }: { workspace: FinanceWorkspace }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Add leave type</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createLeaveType({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              leaveCode: String(fd.get("leaveCode") ?? "").trim(),
              leaveName: String(fd.get("leaveName") ?? "").trim(),
              leaveCategory: String(fd.get("leaveCategory") ?? "pto") as (typeof LEAVE_CATEGORIES)[number],
              isPaid: String(fd.get("isPaid") ?? "true") === "true",
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
          <span className="text-neutral-500 text-xs">Leave code</span>
          <input name="leaveCode" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Leave name</span>
          <input name="leaveName" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Category</span>
          <select name="leaveCategory" className={input}>
            {LEAVE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Paid</span>
          <select name="isPaid" className={input}>
            <option value="true">yes</option>
            <option value="false">no</option>
          </select>
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black hover:bg-amber-500 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Create leave type"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function LeavePolicyCreateForm({
  workspace,
  leaveTypes,
}: {
  workspace: FinanceWorkspace;
  leaveTypes: Lt[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Add leave policy</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createLeavePolicy({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              leaveTypeId: String(fd.get("leaveTypeId") ?? ""),
              policyCode: String(fd.get("policyCode") ?? "").trim(),
              policyName: String(fd.get("policyName") ?? "").trim(),
              accrualMethod: String(fd.get("accrualMethod") ?? "per_pay_period") as (typeof ACCRUAL_METHODS)[number],
              accrualRate: Number(fd.get("accrualRate") ?? "") || undefined,
              annualGrantHours: Number(fd.get("annualGrantHours") ?? "") || undefined,
              maxBalanceHours: Number(fd.get("maxBalanceHours") ?? "") || undefined,
              waitingPeriodDays: 0,
              allowsNegativeBalance: false,
              minimumIncrementHours: 1,
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
          <span className="text-neutral-500 text-xs">Leave type</span>
          <select name="leaveTypeId" required className={input}>
            <option value="">Select…</option>
            {leaveTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.leave_code} — {t.leave_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Policy code</span>
          <input name="policyCode" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Policy name</span>
          <input name="policyName" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Accrual method</span>
          <select name="accrualMethod" className={input}>
            {ACCRUAL_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Accrual rate (optional)</span>
          <input name="accrualRate" type="number" step="0.01" className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Annual grant hours</span>
          <input name="annualGrantHours" type="number" step="0.01" className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Max balance hours</span>
          <input name="maxBalanceHours" type="number" step="0.01" className={input} />
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={pending || !leaveTypes.length}
            className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black hover:bg-amber-500 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Create policy"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function AssignLeavePolicyForm({
  workspace,
  policies,
  people,
}: {
  workspace: FinanceWorkspace;
  policies: Lp[];
  people: PersonRow[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Assign policy to person</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await assignLeavePolicy({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              leavePolicyId: String(fd.get("leavePolicyId") ?? ""),
              financePersonId: String(fd.get("financePersonId") ?? ""),
              effectiveStartDate: String(fd.get("effectiveStartDate") ?? ""),
              effectiveEndDate: String(fd.get("effectiveEndDate") ?? "").trim() || undefined,
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
          <span className="text-neutral-500 text-xs">Policy</span>
          <select name="leavePolicyId" required className={input}>
            <option value="">Select…</option>
            {policies.map((p) => (
              <option key={p.id} value={p.id}>
                {p.policy_code} — {p.policy_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Person</span>
          <select name="financePersonId" required className={input}>
            <option value="">Select…</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.legal_last_name}, {p.legal_first_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Effective start</span>
          <input name="effectiveStartDate" type="date" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Effective end (optional)</span>
          <input name="effectiveEndDate" type="date" className={input} />
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={pending || !policies.length || !people.length}
            className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black hover:bg-amber-500 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Assign policy"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function LeaveRequestSubmitForm({
  workspace,
  leaveTypes,
  people,
}: {
  workspace: FinanceWorkspace;
  leaveTypes: Lt[];
  people: PersonRow[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Submit leave request</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const startD = String(fd.get("requestStartDate") ?? "");
          const endD = String(fd.get("requestEndDate") ?? "");
          const hours = Number(fd.get("requestedHours") ?? 0);
          start(async () => {
            setMsg(null);
            const res = await submitLeaveRequest({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              financePersonId: String(fd.get("financePersonId") ?? ""),
              leaveTypeId: String(fd.get("leaveTypeId") ?? ""),
              requestStartDate: startD,
              requestEndDate: endD,
              days: [{ requestDate: startD, requestedHours: hours }],
              employeeNotes: String(fd.get("employeeNotes") ?? "").trim() || undefined,
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
          <span className="text-neutral-500 text-xs">Person</span>
          <select name="financePersonId" required className={input}>
            <option value="">Select…</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.legal_last_name}, {p.legal_first_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Leave type</span>
          <select name="leaveTypeId" required className={input}>
            <option value="">Select…</option>
            {leaveTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.leave_code} — {t.leave_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Start date</span>
          <input name="requestStartDate" type="date" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">End date</span>
          <input name="requestEndDate" type="date" required className={input} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Hours (first day)</span>
          <input name="requestedHours" type="number" step="0.25" min={0} defaultValue={8} className={input} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Employee notes (optional)</span>
          <input name="employeeNotes" className={input} />
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={pending || !leaveTypes.length || !people.length}
            className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black hover:bg-amber-500 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Submit request"}
          </button>
        </div>
      </form>
    </div>
  );
}

type SubmittedRequestRow = { id: string; request_start_date: string; request_status: string };

export function LeaveRequestApproveForm({
  workspace,
  submittedRequests,
}: {
  workspace: FinanceWorkspace;
  submittedRequests: SubmittedRequestRow[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Approve submitted request</h2>
      <p className="text-xs text-neutral-500 leading-relaxed">
        Approves all requested day lines at their requested hours. Only requests in{" "}
        <code className="text-neutral-400">submitted</code> status are listed.
      </p>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await approveLeaveRequest({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              leaveRequestId: String(fd.get("leaveRequestId") ?? ""),
              approvalNotes: String(fd.get("approvalNotes") ?? "").trim() || undefined,
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
          <span className="text-neutral-500 text-xs">Leave request</span>
          <select name="leaveRequestId" required className={input}>
            <option value="">Select…</option>
            {submittedRequests.map((r) => (
              <option key={r.id} value={r.id}>
                {r.request_start_date} — {r.id.slice(0, 8)}…
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Manager notes (optional)</span>
          <input name="approvalNotes" className={input} />
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={pending || !submittedRequests.length}
            className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black hover:bg-amber-500 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Approve request"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function RunLeaveAccrualsForm({ workspace }: { workspace: FinanceWorkspace }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const defaultAsOf = new Date().toISOString().slice(0, 10);

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Run accruals</h2>
      <p className="text-xs text-neutral-500 leading-relaxed">
        Applies each active policy&apos;s accrual rate to matching employee leave profiles as of the date below and
        writes ledger entries.
      </p>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await runLeaveAccruals({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              asOfDate: String(fd.get("asOfDate") ?? ""),
            });
            setMsg(res.message);
            if (res.success) {
              router.refresh();
            }
          });
        }}
      >
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">As-of date</span>
          <input name="asOfDate" type="date" required className={input} defaultValue={defaultAsOf} />
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black hover:bg-amber-500 disabled:opacity-50"
          >
            {pending ? "Running…" : "Run accruals"}
          </button>
        </div>
      </form>
    </div>
  );
}
