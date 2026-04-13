"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { FinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import {
  applyDesktopPayrollComponents,
  approvePayrollRun,
  assignEmployeePayrollItem,
  calculatePayrollRun,
  createPayGroup,
  createPayrollItemCatalog,
  createPayPeriod,
  createEmployeePayProfile,
  createPayrollRun,
  finalizePayrollRun,
  loadApprovedTimeIntoPayrollRun,
  reversePayrollRun,
  seedPayrollDesktopItemCatalog,
  seedEmployeePayProfiles,
} from "@/modules/payroll/actions/payroll-actions";

const input =
  "rounded-md border border-white/10 bg-white/5 px-3 py-2 text-neutral-200 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/40";

type PayGroupRow = { id: string; group_code: string; group_name: string };
type PayPeriodRow = { id: string; period_name: string; pay_group_id: string };
type PersonRow = { id: string; legal_first_name: string; legal_last_name: string };
type PayrollItemRow = { id: string; item_code: string; item_name: string };
type EmployeePayProfilePickRow = { id: string; employee_number: string | null; finance_person_id: string };

export function PayGroupCreateForm({ workspace }: { workspace: FinanceWorkspace }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Add pay group</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createPayGroup({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              groupCode: String(fd.get("groupCode") ?? "").trim(),
              groupName: String(fd.get("groupName") ?? "").trim(),
              payFrequency: String(fd.get("payFrequency") ?? "monthly") as
                | "weekly"
                | "biweekly"
                | "semimonthly"
                | "monthly"
                | "off_cycle",
              payScheduleAnchorDate: String(fd.get("payScheduleAnchorDate") ?? "").trim() || undefined,
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
          <span className="text-neutral-500 text-xs">Group code</span>
          <input name="groupCode" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Group name</span>
          <input name="groupName" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Pay frequency</span>
          <select name="payFrequency" className={input}>
            <option value="weekly">weekly</option>
            <option value="biweekly">biweekly</option>
            <option value="semimonthly">semimonthly</option>
            <option value="monthly">monthly</option>
            <option value="off_cycle">off_cycle</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Anchor date (optional)</span>
          <input name="payScheduleAnchorDate" type="date" className={input} />
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black hover:bg-amber-500 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Create pay group"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function PayPeriodCreateForm({
  workspace,
  payGroups,
}: {
  workspace: FinanceWorkspace;
  payGroups: PayGroupRow[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Add pay period</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createPayPeriod({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              payGroupId: String(fd.get("payGroupId") ?? ""),
              periodName: String(fd.get("periodName") ?? "").trim(),
              periodStart: String(fd.get("periodStart") ?? ""),
              periodEnd: String(fd.get("periodEnd") ?? ""),
              payDate: String(fd.get("payDate") ?? "").trim() || undefined,
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
          <span className="text-neutral-500 text-xs">Pay group</span>
          <select name="payGroupId" required className={input}>
            <option value="">Select…</option>
            {payGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.group_code} — {g.group_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Period name</span>
          <input name="periodName" required className={input} />
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
          <span className="text-neutral-500 text-xs">Pay date (optional)</span>
          <input name="payDate" type="date" className={input} />
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={pending || !payGroups.length}
            className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black hover:bg-amber-500 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Create pay period"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function EmployeePayProfileForm({
  workspace,
  people,
  payGroups,
}: {
  workspace: FinanceWorkspace;
  people: PersonRow[];
  payGroups: PayGroupRow[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Create employee pay profile</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const payGroupId = String(fd.get("payGroupId") ?? "").trim();
            const res = await createEmployeePayProfile({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              financePersonId: String(fd.get("financePersonId") ?? ""),
              payGroupId: payGroupId || undefined,
              employeeNumber: String(fd.get("employeeNumber") ?? "").trim() || undefined,
              payType: String(fd.get("payType") ?? "hourly") as "hourly" | "salary",
              baseRate: Number(fd.get("baseRate") ?? "") || undefined,
              annualSalary: Number(fd.get("annualSalary") ?? "") || undefined,
              effectiveStartDate: String(fd.get("effectiveStartDate") ?? "").trim() || undefined,
              overtimeEligible: true,
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
          <span className="text-neutral-500 text-xs">Finance person</span>
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
          <span className="text-neutral-500 text-xs">Pay group (optional)</span>
          <select name="payGroupId" className={input}>
            <option value="">—</option>
            {payGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.group_code}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Employee # (optional)</span>
          <input name="employeeNumber" className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Pay type</span>
          <select name="payType" className={input}>
            <option value="hourly">hourly</option>
            <option value="salary">salary</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Base rate (hourly)</span>
          <input name="baseRate" type="number" step="0.01" min={0} className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Annual salary</span>
          <input name="annualSalary" type="number" step="0.01" min={0} className={input} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Effective start (optional)</span>
          <input name="effectiveStartDate" type="date" className={input} />
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={pending || !people.length}
            className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black hover:bg-amber-500 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Create profile"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function EmployeePayProfileSeedButton({
  workspace,
  peopleCount,
}: {
  workspace: FinanceWorkspace;
  peopleCount: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="wf-card border-amber-500/20 bg-amber-950/10 space-y-2.5">
      <p className="text-sm font-medium text-neutral-100">Seed employee profiles</p>
      <p className="text-xs text-neutral-500 leading-relaxed">
        Creates pay profiles for active finance people without one. Uses the first active pay group when available.
      </p>
      <p className="text-xs text-neutral-600">Finance people in tenant: {peopleCount}</p>
      {msg ? <p className="text-xs text-amber-400">{msg}</p> : null}
      <button
        type="button"
        disabled={pending || peopleCount === 0}
        onClick={() => {
          start(async () => {
            const res = await seedEmployeePayProfiles({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              defaultPayType: "hourly",
              defaultBaseRate: 25,
            });
            setMsg(res.message);
            if (res.success) router.refresh();
          });
        }}
        className="rounded-md border border-amber-500/30 bg-amber-500/90 px-4 py-2 text-sm font-medium text-black hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pending ? "Seeding…" : "Seed profiles"}
      </button>
    </div>
  );
}

export function PayrollRunCreateForm({
  workspace,
  payGroups,
  payPeriods,
}: {
  workspace: FinanceWorkspace;
  payGroups: PayGroupRow[];
  payPeriods: PayPeriodRow[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [pg, setPg] = useState("");
  const periodsForGroup = pg ? payPeriods.filter((p) => p.pay_group_id === pg) : [];

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Create payroll run</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createPayrollRun({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              payGroupId: String(fd.get("payGroupId") ?? ""),
              payPeriodId: String(fd.get("payPeriodId") ?? ""),
              runNumber: String(fd.get("runNumber") ?? "").trim() || undefined,
              runType: String(fd.get("runType") ?? "regular") as "regular" | "off_cycle" | "adjustment",
            });
            setMsg(res.message);
            if (res.success) {
              (e.target as HTMLFormElement).reset();
              setPg("");
              router.refresh();
            }
          });
        }}
      >
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Pay group</span>
          <select
            name="payGroupId"
            required
            className={input}
            value={pg}
            onChange={(e) => setPg(e.target.value)}
          >
            <option value="">Select…</option>
            {payGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.group_code} — {g.group_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Pay period</span>
          <select name="payPeriodId" required className={input} disabled={!pg}>
            <option value="">Select…</option>
            {periodsForGroup.map((p) => (
              <option key={p.id} value={p.id}>
                {p.period_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Run number (optional)</span>
          <input name="runNumber" className={input} placeholder="auto if empty" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Run type</span>
          <select name="runType" className={input}>
            <option value="regular">regular</option>
            <option value="off_cycle">off_cycle</option>
            <option value="adjustment">adjustment</option>
          </select>
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={pending || !payGroups.length || !payPeriods.length}
            className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black hover:bg-amber-500 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Create run"}
          </button>
        </div>
      </form>
    </div>
  );
}

type RunPickRow = { id: string; run_number: string; run_status: string };

export function PayrollRunLifecycleForm({
  workspace,
  runs,
}: {
  workspace: FinanceWorkspace;
  runs: RunPickRow[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [runId, setRunId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [reversalReason, setReversalReason] = useState("");

  const base = { tenantId: workspace.tenantId, entityId: workspace.entityId, payrollRunId: runId };

  return (
    <div className="wf-card space-y-4">
      <div>
        <h2 className="text-sm font-medium text-neutral-200">Run pipeline</h2>
        <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
          Select a run, then load approved time (from Pack 002 staging), calculate gross from pay profiles, approve,
          and finalize to post pay statements.
        </p>
      </div>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-neutral-500 text-xs">Payroll run</span>
        <select
          className={input}
          value={runId}
          onChange={(e) => {
            setRunId(e.target.value);
            setMsg(null);
          }}
        >
          <option value="">Select…</option>
          {runs.map((r) => (
            <option key={r.id} value={r.id}>
              {r.run_number} — {r.run_status}
            </option>
          ))}
        </select>
      </label>
      {!runs.length && (
        <p className="text-xs text-neutral-500">Create a payroll run above to use these actions.</p>
      )}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={pending || !runId}
          className="rounded-md border border-white/15 bg-white/5 px-3 py-2 text-left text-sm text-neutral-200 hover:bg-white/10 disabled:opacity-40"
          onClick={() => {
            start(async () => {
              setMsg(null);
              const res = await loadApprovedTimeIntoPayrollRun(base);
              setMsg(res.message);
              if (res.success) router.refresh();
            });
          }}
        >
          {pending ? "Working…" : "Load approved time into run"}
        </button>
        <button
          type="button"
          disabled={pending || !runId}
          className="rounded-md border border-white/15 bg-white/5 px-3 py-2 text-left text-sm text-neutral-200 hover:bg-white/10 disabled:opacity-40"
          onClick={() => {
            start(async () => {
              setMsg(null);
              const res = await calculatePayrollRun(base);
              setMsg(res.message);
              if (res.success) router.refresh();
            });
          }}
        >
          {pending ? "Working…" : "Calculate run (draft → review)"}
        </button>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-neutral-500 text-xs">Approval notes (optional)</span>
          <input
            value={approvalNotes}
            onChange={(e) => setApprovalNotes(e.target.value)}
            className={input}
            placeholder="Reviewer notes"
          />
        </label>
        <button
          type="button"
          disabled={pending || !runId}
          className="rounded-md border border-white/15 bg-white/5 px-3 py-2 text-left text-sm text-neutral-200 hover:bg-white/10 disabled:opacity-40"
          onClick={() => {
            start(async () => {
              setMsg(null);
              const res = await approvePayrollRun({
                ...base,
                actionNotes: approvalNotes.trim() || undefined,
              });
              setMsg(res.message);
              if (res.success) router.refresh();
            });
          }}
        >
          {pending ? "Working…" : "Approve run (review → approved)"}
        </button>
        <button
          type="button"
          disabled={pending || !runId}
          className="rounded-md bg-amber-600/90 px-3 py-2 text-left text-sm font-medium text-black hover:bg-amber-500 disabled:opacity-40"
          onClick={() => {
            start(async () => {
              setMsg(null);
              const res = await finalizePayrollRun(base);
              setMsg(res.message);
              if (res.success) router.refresh();
            });
          }}
        >
          {pending ? "Working…" : "Finalize run (approved → finalized, statements)"}
        </button>
        <div className="border-t border-white/10 pt-4 mt-2 space-y-2">
          <p className="text-xs text-neutral-500 leading-relaxed">
            Reverse a <strong className="text-neutral-400">finalized</strong> run (requires{" "}
            <code className="text-neutral-400">payroll.run.reverse</code>). Sets status to reversed and posts a GL
            reversal of the gross accrual when Pack 017/018 subledger postings exist.
          </p>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-neutral-500 text-xs">Reversal reason</span>
            <input
              value={reversalReason}
              onChange={(e) => setReversalReason(e.target.value)}
              className={input}
              placeholder="Controller sign-off / correction ticket"
            />
          </label>
          <button
            type="button"
            disabled={pending || !runId || !reversalReason.trim()}
            className="rounded-md border border-red-500/40 bg-red-950/25 px-3 py-2 text-left text-sm text-red-200 hover:bg-red-950/40 disabled:opacity-40"
            onClick={() => {
              if (!confirm("Reverse this finalized payroll run? This cannot be undone from the UI.")) return;
              start(async () => {
                setMsg(null);
                const res = await reversePayrollRun({
                  ...base,
                  reason: reversalReason.trim(),
                });
                setMsg(res.message);
                if (res.success) {
                  setReversalReason("");
                  router.refresh();
                }
              });
            }}
          >
            {pending ? "Working…" : "Reverse finalized run"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PayrollDesktopCatalogForm({ workspace }: { workspace: FinanceWorkspace }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Desktop payroll items</h2>
      <p className="text-xs text-neutral-500 leading-relaxed">
        Define earnings, deductions, taxes, and employer contribution items for desktop payroll configuration.
      </p>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          className="rounded-md border border-white/15 bg-white/5 px-3 py-2 text-xs text-neutral-200 hover:bg-white/10 disabled:opacity-40"
          onClick={() => {
            start(async () => {
              setMsg(null);
              const res = await seedPayrollDesktopItemCatalog({
                tenantId: workspace.tenantId,
                entityId: workspace.entityId,
              });
              setMsg(res.message);
              if (res.success) router.refresh();
            });
          }}
        >
          {pending ? "Working…" : "Seed default desktop items"}
        </button>
      </div>
      <form
        className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createPayrollItemCatalog({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              itemCode: String(fd.get("itemCode") ?? "").trim(),
              itemName: String(fd.get("itemName") ?? "").trim(),
              itemType: String(fd.get("itemType") ?? "earning") as
                | "earning"
                | "deduction"
                | "tax"
                | "company_contribution"
                | "accrual",
              calculationMethod: String(fd.get("calculationMethod") ?? "flat_amount") as
                | "flat_amount"
                | "hourly_rate"
                | "percent_of_gross"
                | "fixed_rate",
              defaultRate: Number(fd.get("defaultRate") ?? "") || undefined,
              defaultAmount: Number(fd.get("defaultAmount") ?? "") || undefined,
              defaultPercent: Number(fd.get("defaultPercent") ?? "") || undefined,
              taxability: String(fd.get("taxability") ?? "taxable") as
                | "taxable"
                | "pre_tax"
                | "post_tax"
                | "nontaxable",
              agencyName: String(fd.get("agencyName") ?? "").trim() || undefined,
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
          <input name="itemCode" required className={input} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Name</span>
          <input name="itemName" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Type</span>
          <select name="itemType" className={input}>
            <option value="earning">earning</option>
            <option value="deduction">deduction</option>
            <option value="tax">tax</option>
            <option value="company_contribution">company_contribution</option>
            <option value="accrual">accrual</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Calc method</span>
          <select name="calculationMethod" className={input}>
            <option value="flat_amount">flat_amount</option>
            <option value="hourly_rate">hourly_rate</option>
            <option value="percent_of_gross">percent_of_gross</option>
            <option value="fixed_rate">fixed_rate</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Taxability</span>
          <select name="taxability" className={input}>
            <option value="taxable">taxable</option>
            <option value="pre_tax">pre_tax</option>
            <option value="post_tax">post_tax</option>
            <option value="nontaxable">nontaxable</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Default rate</span>
          <input name="defaultRate" type="number" min={0} step="0.0001" className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Default amount</span>
          <input name="defaultAmount" type="number" min={0} step="0.01" className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Default percent</span>
          <input name="defaultPercent" type="number" min={0} max={1} step="0.0001" className={input} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Agency (optional)</span>
          <input name="agencyName" className={input} />
        </label>
        <div className="md:col-span-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black hover:bg-amber-500 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Create payroll item"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function PayrollItemAssignmentForm({
  workspace,
  profiles,
  items,
}: {
  workspace: FinanceWorkspace;
  profiles: EmployeePayProfilePickRow[];
  items: PayrollItemRow[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Assign payroll items to employees</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await assignEmployeePayrollItem({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              employeePayProfileId: String(fd.get("employeePayProfileId") ?? ""),
              payrollItemId: String(fd.get("payrollItemId") ?? ""),
              overrideRate: Number(fd.get("overrideRate") ?? "") || undefined,
              overrideAmount: Number(fd.get("overrideAmount") ?? "") || undefined,
              overridePercent: Number(fd.get("overridePercent") ?? "") || undefined,
              effectiveStartDate: String(fd.get("effectiveStartDate") ?? "").trim() || undefined,
            });
            setMsg(res.message);
            if (res.success) router.refresh();
          });
        }}
      >
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Employee pay profile</span>
          <select name="employeePayProfileId" required className={input}>
            <option value="">Select…</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.employee_number ?? "no-emp#"} — profile {p.id.slice(0, 8)} — person {p.finance_person_id.slice(0, 8)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Payroll item</span>
          <select name="payrollItemId" required className={input}>
            <option value="">Select…</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.item_code} — {i.item_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Override rate</span>
          <input name="overrideRate" type="number" min={0} step="0.0001" className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Override amount</span>
          <input name="overrideAmount" type="number" min={0} step="0.01" className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Override percent</span>
          <input name="overridePercent" type="number" min={0} max={1} step="0.0001" className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Effective start (optional)</span>
          <input name="effectiveStartDate" type="date" className={input} />
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={pending || !profiles.length || !items.length}
            className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black hover:bg-amber-500 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Assign item"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function PayrollDesktopApplyComponentsForm({
  workspace,
  runs,
}: {
  workspace: FinanceWorkspace;
  runs: { id: string; run_number: string; run_status: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [runId, setRunId] = useState("");

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Apply desktop payroll components</h2>
      <p className="text-xs text-neutral-500 leading-relaxed">
        Applies assigned payroll items to each run item, recalculates gross/net/taxes/deductions, and records liabilities.
      </p>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <label className="flex flex-col gap-1">
        <span className="text-neutral-500 text-xs">Run</span>
        <select name="runId" className={input} value={runId} onChange={(e) => setRunId(e.target.value)}>
          <option value="">Select…</option>
          {runs.map((r) => (
            <option key={r.id} value={r.id}>
              {r.run_number} — {r.run_status}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        disabled={pending || !runId}
        className="rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-neutral-200 hover:bg-white/10 disabled:opacity-40"
        onClick={() => {
          start(async () => {
            setMsg(null);
            const res = await applyDesktopPayrollComponents({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              payrollRunId: runId,
            });
            setMsg(res.message);
            if (res.success) router.refresh();
          });
        }}
      >
        {pending ? "Working…" : "Apply components and liabilities"}
      </button>
    </div>
  );
}
