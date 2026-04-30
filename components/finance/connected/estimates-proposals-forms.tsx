"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { FinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import {
  createEstimateWithLineItem,
  createFinanceCostProfile,
  generateRenewalRecommendation,
  generateContractProfitAudit,
  generateProposalFromEstimate,
  reviewEstimateApproval,
  runEstimateScenarioStressTest,
  seedPricingTemplates,
  updateDealOutcome,
} from "@/modules/pricing-engine/actions/pricing-engine-actions";

const input =
  "rounded-md border border-white/10 bg-white/5 px-3 py-2 text-neutral-200 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/40";

type EstimateRow = { id: string; estimate_number: string; title: string; margin_percent: number };

export function CostProfileCreateForm({ workspace }: { workspace: FinanceWorkspace }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Cost profile settings</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            const res = await createFinanceCostProfile({
              tenantId: workspace.tenantId,
              name: String(fd.get("name") ?? "").trim(),
              payrollTaxRate: Number(fd.get("payrollTaxRate") ?? 0),
              workersCompRate: Number(fd.get("workersCompRate") ?? 0),
              disabilityPflRate: Number(fd.get("disabilityPflRate") ?? 0),
              liabilityRate: Number(fd.get("liabilityRate") ?? 0),
              overheadRate: Number(fd.get("overheadRate") ?? 0),
              adminRate: Number(fd.get("adminRate") ?? 0),
              supervisionRate: Number(fd.get("supervisionRate") ?? 0),
              technologyRate: Number(fd.get("technologyRate") ?? 0),
              targetMargin: Number(fd.get("targetMargin") ?? 0.3),
              minimumMargin: Number(fd.get("minimumMargin") ?? 0.2),
              isDefault: String(fd.get("isDefault") ?? "") === "on",
            });
            setMsg(res.message);
            if (res.success) {
              (e.target as HTMLFormElement).reset();
              router.refresh();
            }
          });
        }}
      >
        <label className="flex flex-col gap-1 md:col-span-3">
          <span className="text-neutral-500 text-xs">Profile name</span>
          <input name="name" required className={input} />
        </label>
        {[
          ["payrollTaxRate", "Payroll tax rate"],
          ["workersCompRate", "Workers comp rate"],
          ["disabilityPflRate", "Disability/PFL rate"],
          ["liabilityRate", "Liability rate"],
          ["overheadRate", "Overhead rate"],
          ["adminRate", "Admin rate"],
          ["supervisionRate", "Supervision rate"],
          ["technologyRate", "Technology rate"],
          ["targetMargin", "Target margin"],
          ["minimumMargin", "Minimum margin"],
        ].map(([name, label]) => (
          <label className="flex flex-col gap-1" key={name}>
            <span className="text-neutral-500 text-xs">{label}</span>
            <input name={name} type="number" step="0.01" min={0} defaultValue={name.includes("Margin") ? 0.3 : 0} className={input} />
          </label>
        ))}
        <label className="md:col-span-3 inline-flex items-center gap-2 text-xs text-neutral-400">
          <input name="isDefault" type="checkbox" className="rounded border-white/20 bg-white/5" /> Set as default
        </label>
        <div className="md:col-span-3">
          <button type="submit" disabled={pending} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black hover:bg-amber-500 disabled:opacity-50">
            {pending ? "Saving..." : "Save cost profile"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function EstimateQuickCreateForm({
  workspace,
  costProfiles,
  templates,
}: {
  workspace: FinanceWorkspace;
  costProfiles: { id: string; name: string; is_default: boolean }[];
  templates: { id: string; template_name: string; personnel_type: string; default_margin: number }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">New estimate wizard</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            const res = await createEstimateWithLineItem({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              title: String(fd.get("title") ?? "").trim(),
              personnelType: String(fd.get("personnelType") ?? "").trim(),
              costProfileId: String(fd.get("costProfileId") ?? "") || undefined,
              hoursPerWeek: Number(fd.get("hoursPerWeek") ?? 0),
              weeks: Number(fd.get("weeks") ?? 0),
              basePayRate: Number(fd.get("basePayRate") ?? 0),
              overtimeHours: Number(fd.get("overtimeHours") ?? 0),
              overtimeMultiplier: Number(fd.get("overtimeMultiplier") ?? 1.5),
              burdenRate: Number(fd.get("burdenRate") ?? 0),
              directExpenseTotal: Number(fd.get("directExpenseTotal") ?? 0),
              indirectExpenseTotal: Number(fd.get("indirectExpenseTotal") ?? 0),
              targetMargin: Number(fd.get("targetMargin") ?? 0.3),
              minimumMargin: Number(fd.get("minimumMargin") ?? 0.2),
              riskLevel: String(fd.get("riskLevel") ?? "low") as "low" | "moderate" | "high",
              riskAdjustmentRate: Number(fd.get("riskAdjustmentRate") ?? 0),
              billRateOverride: Number(fd.get("billRateOverride") ?? 0) || undefined,
            });
            setMsg(res.data?.warning ? `${res.message} ${res.data.warning}` : res.message);
            if (res.success) {
              (e.target as HTMLFormElement).reset();
              router.refresh();
            }
          });
        }}
      >
        <label className="flex flex-col gap-1 md:col-span-3">
          <span className="text-neutral-500 text-xs">Estimate title</span>
          <input name="title" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Personnel type</span>
          <input name="personnelType" defaultValue="Unarmed Guard" className={input} required />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Cost profile</span>
          <select name="costProfileId" className={input}>
            <option value="">No profile</option>
            {costProfiles.map((p) => (
              <option key={p.id} value={p.id}>{p.name}{p.is_default ? " (Default)" : ""}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Service package template</span>
          <select name="templateId" className={input}>
            <option value="">No template</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.template_name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Hours/week</span>
          <input name="hoursPerWeek" type="number" step="0.25" min={0.25} defaultValue={40} className={input} />
        </label>
        <label className="flex flex-col gap-1"><span className="text-neutral-500 text-xs">Weeks</span><input name="weeks" type="number" step="0.25" min={0.25} defaultValue={4} className={input} /></label>
        <label className="flex flex-col gap-1"><span className="text-neutral-500 text-xs">Base pay rate</span><input name="basePayRate" type="number" step="0.01" min={0} defaultValue={20} className={input} /></label>
        <label className="flex flex-col gap-1"><span className="text-neutral-500 text-xs">Overtime hours</span><input name="overtimeHours" type="number" step="0.25" min={0} defaultValue={0} className={input} /></label>
        <label className="flex flex-col gap-1"><span className="text-neutral-500 text-xs">Overtime multiplier</span><input name="overtimeMultiplier" type="number" step="0.01" min={1} defaultValue={1.5} className={input} /></label>
        <label className="flex flex-col gap-1"><span className="text-neutral-500 text-xs">Burden rate</span><input name="burdenRate" type="number" step="0.01" min={0} defaultValue={0.18} className={input} /></label>
        <label className="flex flex-col gap-1"><span className="text-neutral-500 text-xs">Direct expenses</span><input name="directExpenseTotal" type="number" step="0.01" min={0} defaultValue={0} className={input} /></label>
        <label className="flex flex-col gap-1"><span className="text-neutral-500 text-xs">Indirect expenses</span><input name="indirectExpenseTotal" type="number" step="0.01" min={0} defaultValue={0} className={input} /></label>
        <label className="flex flex-col gap-1"><span className="text-neutral-500 text-xs">Target margin</span><input name="targetMargin" type="number" step="0.01" min={0.01} max={0.95} defaultValue={0.3} className={input} /></label>
        <label className="flex flex-col gap-1"><span className="text-neutral-500 text-xs">Minimum margin</span><input name="minimumMargin" type="number" step="0.01" min={0} max={0.95} defaultValue={0.2} className={input} /></label>
        <label className="flex flex-col gap-1"><span className="text-neutral-500 text-xs">Risk level</span>
          <select name="riskLevel" className={input}>
            <option value="low">Low</option>
            <option value="moderate">Moderate</option>
            <option value="high">High</option>
          </select>
        </label>
        <label className="flex flex-col gap-1"><span className="text-neutral-500 text-xs">Risk adjustment rate</span><input name="riskAdjustmentRate" type="number" step="0.01" min={0} max={0.5} defaultValue={0} className={input} /></label>
        <label className="flex flex-col gap-1"><span className="text-neutral-500 text-xs">Bill rate override (optional)</span><input name="billRateOverride" type="number" step="0.01" min={0} className={input} /></label>
        <div className="md:col-span-3">
          <button type="submit" disabled={pending} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black hover:bg-amber-500 disabled:opacity-50">
            {pending ? "Calculating..." : "Create estimate"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function ProposalAndOutcomeForms({ workspace, estimates }: { workspace: FinanceWorkspace; estimates: EstimateRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="wf-card space-y-3">
        <h2 className="text-sm font-medium text-neutral-200">Proposal builder</h2>
        {msg && <p className="text-xs text-amber-400">{msg}</p>}
        <form
          className="grid grid-cols-1 gap-3 text-sm"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              const res = await generateProposalFromEstimate({
                tenantId: workspace.tenantId,
                estimateId: String(fd.get("estimateId") ?? ""),
                sentTo: String(fd.get("sentTo") ?? "").trim() || undefined,
                expiresInDays: Number(fd.get("expiresInDays") ?? 30),
              });
              setMsg(res.success && res.data ? `${res.message} Public token: ${res.data.publicToken}` : res.message);
              if (res.success) router.refresh();
            });
          }}
        >
          <select name="estimateId" required className={input}>
            <option value="">Select estimate...</option>
            {estimates.map((e) => <option key={e.id} value={e.id}>{e.estimate_number} - {e.title}</option>)}
          </select>
          <input name="sentTo" type="email" placeholder="Client email (optional)" className={input} />
          <input name="expiresInDays" type="number" min={1} max={180} defaultValue={30} className={input} />
          <button type="submit" disabled={pending} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black hover:bg-amber-500 disabled:opacity-50">
            {pending ? "Generating..." : "Generate proposal"}
          </button>
        </form>
      </div>

      <div className="wf-card space-y-3">
        <h2 className="text-sm font-medium text-neutral-200">Deal outcome update</h2>
        <form
          className="grid grid-cols-1 gap-3 text-sm"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              const res = await updateDealOutcome({
                tenantId: workspace.tenantId,
                estimateId: String(fd.get("estimateId") ?? ""),
                outcome: String(fd.get("outcome") ?? "lost") as "won" | "lost" | "expired",
                outcomeReason: String(fd.get("outcomeReason") ?? "").trim() || undefined,
                finalValue: Number(fd.get("finalValue") ?? 0) || undefined,
                finalMargin: Number(fd.get("finalMargin") ?? 0) || undefined,
                notes: String(fd.get("notes") ?? "").trim() || undefined,
              });
              setMsg(res.message);
              if (res.success) router.refresh();
            });
          }}
        >
          <select name="estimateId" required className={input}>
            <option value="">Select estimate...</option>
            {estimates.map((e) => <option key={e.id} value={e.id}>{e.estimate_number} - {e.title}</option>)}
          </select>
          <select name="outcome" className={input}>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
            <option value="expired">Expired</option>
          </select>
          <input name="outcomeReason" placeholder="Outcome reason (optional)" className={input} />
          <input name="finalValue" type="number" step="0.01" min={0} placeholder="Final value (optional)" className={input} />
          <input name="finalMargin" type="number" step="0.01" min={0} max={0.95} placeholder="Final margin (optional)" className={input} />
          <input name="notes" placeholder="Notes (optional)" className={input} />
          <button type="submit" disabled={pending} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black hover:bg-amber-500 disabled:opacity-50">
            {pending ? "Saving..." : "Save outcome"}
          </button>
        </form>
      </div>
    </div>
  );
}

export function TemplateAndApprovalForms({ workspace, estimates }: { workspace: FinanceWorkspace; estimates: EstimateRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="wf-card space-y-3">
        <h2 className="text-sm font-medium text-neutral-200">Service package templates</h2>
        {msg && <p className="text-xs text-amber-400">{msg}</p>}
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await seedPricingTemplates({ tenantId: workspace.tenantId });
              setMsg(res.message);
              if (res.success) router.refresh();
            })
          }
          className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black hover:bg-amber-500 disabled:opacity-50"
        >
          {pending ? "Seeding..." : "Seed default templates"}
        </button>
      </div>
      <div className="wf-card space-y-3">
        <h2 className="text-sm font-medium text-neutral-200">Approval workflow</h2>
        <form
          className="grid grid-cols-1 gap-3 text-sm"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              const res = await reviewEstimateApproval({
                tenantId: workspace.tenantId,
                estimateId: String(fd.get("estimateId") ?? ""),
                approve: String(fd.get("decision") ?? "approve") === "approve",
                comments: String(fd.get("comments") ?? "").trim() || undefined,
              });
              setMsg(res.message);
              if (res.success) router.refresh();
            });
          }}
        >
          <select name="estimateId" required className={input}>
            <option value="">Select estimate...</option>
            {estimates.map((e) => <option key={e.id} value={e.id}>{e.estimate_number} - {e.title}</option>)}
          </select>
          <select name="decision" className={input}>
            <option value="approve">Approve</option>
            <option value="reject">Reject</option>
          </select>
          <input name="comments" placeholder="Comments (optional)" className={input} />
          <button type="submit" disabled={pending} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black hover:bg-amber-500 disabled:opacity-50">
            {pending ? "Saving..." : "Submit decision"}
          </button>
        </form>
      </div>
    </div>
  );
}

export function ProfitIntelligenceForms({ workspace, estimates }: { workspace: FinanceWorkspace; estimates: EstimateRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="wf-card space-y-3">
        <h2 className="text-sm font-medium text-neutral-200">Generate profit audit</h2>
        {msg && <p className="text-xs text-amber-400">{msg}</p>}
        <form
          className="grid grid-cols-1 gap-3 text-sm"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              const res = await generateContractProfitAudit({
                tenantId: workspace.tenantId,
                estimateId: String(fd.get("estimateId") ?? ""),
                periodStart: String(fd.get("periodStart") ?? ""),
                periodEnd: String(fd.get("periodEnd") ?? ""),
                actualRevenue: Number(fd.get("actualRevenue") ?? 0),
                actualCost: Number(fd.get("actualCost") ?? 0),
              });
              setMsg(res.message);
              if (res.success) router.refresh();
            });
          }}
        >
          <select name="estimateId" required className={input}>
            <option value="">Select estimate...</option>
            {estimates.map((e) => <option key={e.id} value={e.id}>{e.estimate_number} - {e.title}</option>)}
          </select>
          <input name="periodStart" type="date" required className={input} />
          <input name="periodEnd" type="date" required className={input} />
          <input name="actualRevenue" type="number" step="0.01" min={0} placeholder="Actual revenue" required className={input} />
          <input name="actualCost" type="number" step="0.01" min={0} placeholder="Actual cost" required className={input} />
          <button type="submit" disabled={pending} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black hover:bg-amber-500 disabled:opacity-50">
            {pending ? "Generating..." : "Generate audit"}
          </button>
        </form>
      </div>
      <div className="wf-card space-y-3">
        <h2 className="text-sm font-medium text-neutral-200">Scenario stress test</h2>
        <form
          className="grid grid-cols-1 gap-3 text-sm"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              const res = await runEstimateScenarioStressTest({
                tenantId: workspace.tenantId,
                estimateId: String(fd.get("estimateId") ?? ""),
                wageIncreaseRate: Number(fd.get("wageIncreaseRate") ?? 0),
                workersCompIncreaseRate: Number(fd.get("workersCompIncreaseRate") ?? 0),
                addedSupervisorCost: Number(fd.get("addedSupervisorCost") ?? 0),
                addedCoverageHours: Number(fd.get("addedCoverageHours") ?? 0),
                reducedBillRate: Number(fd.get("reducedBillRate") ?? 0),
              });
              if (res.success && res.data) {
                setMsg(
                  `${res.message} Revised margin: ${(res.data.revisedMargin * 100).toFixed(1)}%, revised bill rate: ${res.data.revisedBillRate.toFixed(2)}, risk: ${res.data.riskLevel}.`,
                );
              } else {
                setMsg(res.message);
              }
            });
          }}
        >
          <select name="estimateId" required className={input}>
            <option value="">Select estimate...</option>
            {estimates.map((e) => <option key={e.id} value={e.id}>{e.estimate_number} - {e.title}</option>)}
          </select>
          <input name="wageIncreaseRate" type="number" step="0.01" min={0} max={0.5} placeholder="Wage increase rate (e.g. 0.10)" className={input} />
          <input name="workersCompIncreaseRate" type="number" step="0.01" min={0} max={0.5} placeholder="Workers comp increase rate" className={input} />
          <input name="addedSupervisorCost" type="number" step="0.01" min={0} placeholder="Added supervisor cost" className={input} />
          <input name="addedCoverageHours" type="number" step="0.25" min={0} placeholder="Added coverage hours" className={input} />
          <input name="reducedBillRate" type="number" step="0.01" min={0} placeholder="Reduced bill rate requested" className={input} />
          <button type="submit" disabled={pending} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black hover:bg-amber-500 disabled:opacity-50">
            {pending ? "Running..." : "Run scenario"}
          </button>
        </form>
      </div>
      <div className="wf-card space-y-3">
        <h2 className="text-sm font-medium text-neutral-200">Renewal & escalation engine</h2>
        <form
          className="grid grid-cols-1 gap-3 text-sm"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              const res = await generateRenewalRecommendation({
                tenantId: workspace.tenantId,
                estimateId: String(fd.get("estimateId") ?? ""),
                contractAnniversaryDate: String(fd.get("contractAnniversaryDate") ?? ""),
                currentBillRate: Number(fd.get("currentBillRate") ?? 0),
                wageIncreaseRate: Number(fd.get("wageIncreaseRate") ?? 0),
                insuranceIncreaseRate: Number(fd.get("insuranceIncreaseRate") ?? 0),
                overtimeTrendRate: Number(fd.get("overtimeTrendRate") ?? 0),
                inflationRate: Number(fd.get("inflationRate") ?? 0),
              });
              if (res.success && res.data) {
                setMsg(
                  `${res.message} Escalation: ${(res.data.recommendedEscalationRate * 100).toFixed(1)}%, recommended bill rate: ${res.data.recommendedBillRate.toFixed(2)}.`,
                );
                router.refresh();
              } else {
                setMsg(res.message);
              }
            });
          }}
        >
          <select name="estimateId" required className={input}>
            <option value="">Select estimate...</option>
            {estimates.map((e) => <option key={e.id} value={e.id}>{e.estimate_number} - {e.title}</option>)}
          </select>
          <input name="contractAnniversaryDate" type="date" required className={input} />
          <input name="currentBillRate" type="number" step="0.01" min={0} placeholder="Current bill rate" required className={input} />
          <input name="wageIncreaseRate" type="number" step="0.01" min={0} max={0.5} placeholder="Wage increase rate" className={input} />
          <input name="insuranceIncreaseRate" type="number" step="0.01" min={0} max={0.5} placeholder="Insurance increase rate" className={input} />
          <input name="overtimeTrendRate" type="number" step="0.01" min={0} max={0.5} placeholder="Overtime trend rate" className={input} />
          <input name="inflationRate" type="number" step="0.01" min={0} max={0.5} placeholder="Inflation/escalation floor" className={input} />
          <button type="submit" disabled={pending} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black hover:bg-amber-500 disabled:opacity-50">
            {pending ? "Generating..." : "Generate renewal recommendation"}
          </button>
        </form>
      </div>
    </div>
  );
}
