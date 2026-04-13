"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { FinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import {
  createCloseChecklist,
  createDashboardDefinition,
  createKpiDefinition,
  createReportDefinition,
} from "@/modules/reporting/actions/reporting-actions";
import {
  createBudgetVersion,
  createBudgetLine,
  createForecastVersion,
  createForecastLine,
  createVarianceSnapshot,
} from "@/modules/planning/actions/planning-actions";
import {
  addEntityToConsolidationGroup,
  createClientPortalProfile,
  createConsolidationGroup,
  createEntityRelationship,
  createIntercompanyAccount,
  createIntercompanyTransaction,
  createTenantActivationChecklist,
  createTenantActivationTask,
  createTenantProvisioningTemplate,
  generateConsolidationSnapshot,
  startTenantBootstrapRun,
  upsertTenantFeatureFlag,
} from "@/modules/consolidation/actions/consolidation-actions";
import {
  createAuditReviewLog,
  createDisasterRecoveryExercise,
  createOperationalAlert,
  createReleaseChecklist,
  createReleaseTask,
  createReleaseVersion,
  createTestResult,
  createTestSuite,
  recordJobRunStart,
  startBackupVerificationRun,
  startRestoreTestRun,
  startTestRun,
  upsertSystemHealthCheck,
} from "@/modules/operations/actions/operations-actions";

const input =
  "rounded-md border border-white/10 bg-white/5 px-3 py-2 text-neutral-200 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/40";

type Bv = { id: string; budget_code: string; budget_name: string; fiscal_year: number };
type Fv = { id: string; forecast_code: string; forecast_name: string; fiscal_year: number };
type Cg = { id: string; group_code: string; group_name: string };
type Ent = { id: string; code: string; display_name: string };
type ActivationChecklist = { id: string; checklist_name: string; activation_status: string };
type FeatureFlagDef = { id: string; flag_key: string; flag_name: string };
type CustomerOpt = { id: string; customer_code: string; display_name: string };
type ProvisioningTemplate = { id: string; template_code: string; template_name: string };
type TestSuiteOpt = { id: string; suite_code: string; suite_name: string };
type TestRunOpt = { id: string; test_suite_id: string; run_status: string; run_environment: string };
type ReleaseVersionOpt = { id: string; release_code: string; release_name: string };
type ReleaseChecklistOpt = { id: string; checklist_name: string; checklist_status: string };

export function ReportDefinitionForm({ workspace }: { workspace: FinanceWorkspace }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Add report definition</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createReportDefinition({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              reportCode: String(fd.get("reportCode") ?? "").trim(),
              reportName: String(fd.get("reportName") ?? "").trim(),
              reportCategory: String(fd.get("reportCategory") ?? "ar") as "financial_statement" | "ar" | "ap" | "payroll" | "leave" | "banking" | "billing" | "inventory" | "executive" | "other",
              outputType: String(fd.get("outputType") ?? "table") as "table" | "snapshot" | "chart" | "kpi",
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
          <span className="text-neutral-500 text-xs">Report code</span>
          <input name="reportCode" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Report name</span>
          <input name="reportName" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Category</span>
          <select name="reportCategory" className={input}>
            <option value="ar">ar</option>
            <option value="ap">ap</option>
            <option value="financial_statement">financial_statement</option>
            <option value="executive">executive</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Output</span>
          <select name="outputType" className={input}>
            <option value="table">table</option>
            <option value="snapshot">snapshot</option>
          </select>
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
            {pending ? "Saving…" : "Create report"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function DashboardDefinitionForm({ workspace }: { workspace: FinanceWorkspace }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Add dashboard definition</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createDashboardDefinition({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              dashboardCode: String(fd.get("dashboardCode") ?? "").trim(),
              dashboardName: String(fd.get("dashboardName") ?? "").trim(),
              dashboardCategory: String(fd.get("dashboardCategory") ?? "executive") as
                | "executive"
                | "billing"
                | "payroll"
                | "ar"
                | "ap"
                | "banking"
                | "inventory"
                | "operations_finance",
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
          <span className="text-neutral-500 text-xs">Dashboard code</span>
          <input name="dashboardCode" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Dashboard name</span>
          <input name="dashboardName" required className={input} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Category</span>
          <select name="dashboardCategory" className={input}>
            <option value="executive">executive</option>
            <option value="operations_finance">operations_finance</option>
          </select>
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
            {pending ? "Saving…" : "Create dashboard"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function KpiDefinitionForm({ workspace }: { workspace: FinanceWorkspace }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Add KPI definition</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createKpiDefinition({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              kpiCode: String(fd.get("kpiCode") ?? "").trim(),
              kpiName: String(fd.get("kpiName") ?? "").trim(),
              kpiCategory: String(fd.get("kpiCategory") ?? "executive") as
                | "cash"
                | "ar"
                | "ap"
                | "payroll"
                | "leave"
                | "billing"
                | "inventory"
                | "profitability"
                | "executive",
              measureType: String(fd.get("measureType") ?? "currency") as
                | "currency"
                | "hours"
                | "count"
                | "percentage"
                | "other",
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
          <span className="text-neutral-500 text-xs">KPI code</span>
          <input name="kpiCode" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">KPI name</span>
          <input name="kpiName" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Category</span>
          <select name="kpiCategory" className={input}>
            <option value="executive">executive</option>
            <option value="cash">cash</option>
            <option value="ar">ar</option>
            <option value="ap">ap</option>
            <option value="profitability">profitability</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Measure type</span>
          <select name="measureType" className={input}>
            <option value="currency">currency</option>
            <option value="count">count</option>
            <option value="percentage">percentage</option>
            <option value="hours">hours</option>
          </select>
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
            {pending ? "Saving…" : "Create KPI"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function CloseChecklistForm({ workspace }: { workspace: FinanceWorkspace }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Start close checklist</h2>
      <p className="text-xs text-neutral-500 leading-relaxed">
        Creates a draft checklist for this entity. Close tasks can be added in a follow-on workflow.
      </p>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createCloseChecklist({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              checklistName: String(fd.get("checklistName") ?? "").trim(),
              closePeriodStart: String(fd.get("closePeriodStart") ?? "").trim() || undefined,
              closePeriodEnd: String(fd.get("closePeriodEnd") ?? "").trim() || undefined,
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
          <span className="text-neutral-500 text-xs">Checklist name</span>
          <input name="checklistName" required className={input} placeholder="FY2026 Q1 close" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Period start</span>
          <input name="closePeriodStart" type="date" className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Period end</span>
          <input name="closePeriodEnd" type="date" className={input} />
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
            {pending ? "Saving…" : "Create checklist"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function VarianceSnapshotForm({
  workspace,
  budgetVersions,
  forecastVersions,
}: {
  workspace: FinanceWorkspace;
  budgetVersions: Bv[];
  forecastVersions: Fv[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Record variance snapshot</h2>
      <p className="text-xs text-neutral-500">
        Creates a snapshot row (empty JSON shell). Populate metrics in a later analytics pass.
      </p>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const comparisonType = String(fd.get("comparisonType") ?? "") as
              | "budget_vs_actual"
              | "forecast_vs_actual"
              | "budget_vs_forecast";
            const budgetId = String(fd.get("budgetVersionId") ?? "").trim();
            const forecastId = String(fd.get("forecastVersionId") ?? "").trim();
            const res = await createVarianceSnapshot({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              snapshotDate: String(fd.get("snapshotDate") ?? today),
              comparisonType,
              budgetVersionId: budgetId || undefined,
              forecastVersionId: forecastId || undefined,
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
          <span className="text-neutral-500 text-xs">Snapshot date</span>
          <input name="snapshotDate" type="date" required defaultValue={today} className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Comparison type</span>
          <select name="comparisonType" required className={input}>
            <option value="budget_vs_actual">Budget vs actual</option>
            <option value="forecast_vs_actual">Forecast vs actual</option>
            <option value="budget_vs_forecast">Budget vs forecast</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Budget version (when comparison uses budget)</span>
          <select name="budgetVersionId" className={input} defaultValue="">
            <option value="">—</option>
            {budgetVersions.map((b) => (
              <option key={b.id} value={b.id}>
                {b.budget_code} · {b.budget_name} ({b.fiscal_year})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Forecast version (when comparison uses forecast)</span>
          <select name="forecastVersionId" className={input} defaultValue="">
            <option value="">—</option>
            {forecastVersions.map((f) => (
              <option key={f.id} value={f.id}>
                {f.forecast_code} · {f.forecast_name} ({f.fiscal_year})
              </option>
            ))}
          </select>
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
            {pending ? "Saving…" : "Create snapshot"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function BudgetVersionForm({ workspace }: { workspace: FinanceWorkspace }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Add budget version</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createBudgetVersion({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              budgetCode: String(fd.get("budgetCode") ?? "").trim(),
              budgetName: String(fd.get("budgetName") ?? "").trim(),
              fiscalYear: Number(fd.get("fiscalYear") ?? new Date().getFullYear()),
              versionNumber: Number(fd.get("versionNumber") ?? 1) || 1,
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
          <span className="text-neutral-500 text-xs">Budget code</span>
          <input name="budgetCode" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Budget name</span>
          <input name="budgetName" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Fiscal year</span>
          <input name="fiscalYear" type="number" min={2000} max={2100} defaultValue={new Date().getFullYear()} className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Version #</span>
          <input name="versionNumber" type="number" min={1} defaultValue={1} className={input} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Notes</span>
          <input name="notes" className={input} />
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
            {pending ? "Saving…" : "Create budget"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function BudgetLineForm({ workspace, budgetVersions }: { workspace: FinanceWorkspace; budgetVersions: Bv[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Add budget line</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createBudgetLine({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              budgetVersionId: String(fd.get("budgetVersionId") ?? ""),
              lineMonth: Number(fd.get("lineMonth") ?? 1),
              amount: Number(fd.get("amount") ?? 0),
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
          <span className="text-neutral-500 text-xs">Budget version</span>
          <select name="budgetVersionId" required className={input}>
            <option value="">Select…</option>
            {budgetVersions.map((b) => (
              <option key={b.id} value={b.id}>
                {b.budget_code} ({b.fiscal_year}) — {b.budget_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Month (1–12)</span>
          <input name="lineMonth" type="number" min={1} max={12} defaultValue={1} className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Amount</span>
          <input name="amount" type="number" step="0.01" defaultValue={0} className={input} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Notes</span>
          <input name="notes" className={input} />
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending || !budgetVersions.length} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
            {pending ? "Saving…" : "Add line"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function ForecastVersionForm({ workspace }: { workspace: FinanceWorkspace }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Add forecast version</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createForecastVersion({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              forecastCode: String(fd.get("forecastCode") ?? "").trim(),
              forecastName: String(fd.get("forecastName") ?? "").trim(),
              fiscalYear: Number(fd.get("fiscalYear") ?? new Date().getFullYear()),
              versionNumber: Number(fd.get("versionNumber") ?? 1) || 1,
              basisType: String(fd.get("basisType") ?? "manual") as "manual" | "budget_based" | "trend_based" | "scenario_based",
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
          <span className="text-neutral-500 text-xs">Forecast code</span>
          <input name="forecastCode" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Forecast name</span>
          <input name="forecastName" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Fiscal year</span>
          <input name="fiscalYear" type="number" min={2000} max={2100} defaultValue={new Date().getFullYear()} className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Version #</span>
          <input name="versionNumber" type="number" min={1} defaultValue={1} className={input} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Basis</span>
          <select name="basisType" className={input}>
            <option value="manual">manual</option>
            <option value="budget_based">budget_based</option>
          </select>
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
            {pending ? "Saving…" : "Create forecast"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function ForecastLineForm({ workspace, forecastVersions }: { workspace: FinanceWorkspace; forecastVersions: Fv[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Add forecast line</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createForecastLine({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              forecastVersionId: String(fd.get("forecastVersionId") ?? ""),
              lineMonth: Number(fd.get("lineMonth") ?? 1),
              amount: Number(fd.get("amount") ?? 0),
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
          <span className="text-neutral-500 text-xs">Forecast version</span>
          <select name="forecastVersionId" required className={input}>
            <option value="">Select…</option>
            {forecastVersions.map((f) => (
              <option key={f.id} value={f.id}>
                {f.forecast_code} ({f.fiscal_year})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Month</span>
          <input name="lineMonth" type="number" min={1} max={12} defaultValue={1} className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Amount</span>
          <input name="amount" type="number" step="0.01" defaultValue={0} className={input} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Notes</span>
          <input name="notes" className={input} />
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending || !forecastVersions.length} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
            {pending ? "Saving…" : "Add line"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function ProvisioningTemplateForm({ workspace }: { workspace: FinanceWorkspace }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Add provisioning template</h2>
      <p className="text-xs text-neutral-500">Global template (unique code). Requires consolidation.group.manage.</p>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createTenantProvisioningTemplate({
              tenantId: workspace.tenantId,
              templateCode: String(fd.get("templateCode") ?? "").trim(),
              templateName: String(fd.get("templateName") ?? "").trim(),
              templateStatus: String(fd.get("templateStatus") ?? "active") as "active" | "inactive",
              templateJsonText: String(fd.get("templateJsonText") ?? "").trim() || undefined,
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
          <span className="text-neutral-500 text-xs">Template code</span>
          <input name="templateCode" required className={input} placeholder="default-tenant-v1" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Template name</span>
          <input name="templateName" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Status</span>
          <select name="templateStatus" className={input}>
            <option value="active">active</option>
            <option value="inactive">inactive</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Template JSON (optional)</span>
          <textarea name="templateJsonText" rows={4} className={`${input} font-mono text-xs`} placeholder="{}" />
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
            {pending ? "Saving…" : "Create template"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function ConsolidationGroupForm({ workspace }: { workspace: FinanceWorkspace }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Add consolidation group</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createConsolidationGroup({
              tenantId: workspace.tenantId,
              groupCode: String(fd.get("groupCode") ?? "").trim(),
              groupName: String(fd.get("groupName") ?? "").trim(),
              consolidationCurrency: String(fd.get("consolidationCurrency") ?? "USD"),
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
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Currency</span>
          <input name="consolidationCurrency" maxLength={3} defaultValue="USD" className={input} />
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
            {pending ? "Saving…" : "Create group"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function AddEntityToConsolidationGroupForm({
  workspace,
  groups,
}: {
  workspace: FinanceWorkspace;
  groups: Cg[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Include current entity in group</h2>
      <p className="text-xs text-neutral-500">Adds entity {workspace.entityCode} to the selected consolidation group.</p>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await addEntityToConsolidationGroup({
              tenantId: workspace.tenantId,
              consolidationGroupId: String(fd.get("consolidationGroupId") ?? ""),
              entityId: workspace.entityId,
              inclusionStatus: "included",
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
          <span className="text-neutral-500 text-xs">Consolidation group</span>
          <select name="consolidationGroupId" required className={input}>
            <option value="">Select…</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.group_code} — {g.group_name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={pending || !groups.length} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
          {pending ? "Saving…" : "Add entity"}
        </button>
      </form>
    </div>
  );
}

export function EntityRelationshipForm({ workspace, entities }: { workspace: FinanceWorkspace; entities: Ent[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Add entity relationship</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createEntityRelationship({
              tenantId: workspace.tenantId,
              parentEntityId: String(fd.get("parentEntityId") ?? ""),
              childEntityId: String(fd.get("childEntityId") ?? ""),
              relationshipType: String(fd.get("relationshipType") ?? "subsidiary") as
                | "subsidiary"
                | "division"
                | "branch_entity"
                | "managed_entity"
                | "intercompany",
              ownershipPercentage: (() => {
                const raw = String(fd.get("ownershipPercentage") ?? "").trim();
                if (!raw) return undefined;
                const n = Number(raw);
                return Number.isFinite(n) ? n : undefined;
              })(),
              effectiveStartDate: (() => {
                const d = String(fd.get("effectiveStartDate") ?? "").trim();
                return d ? d : undefined;
              })(),
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
          <span className="text-neutral-500 text-xs">Parent entity</span>
          <select name="parentEntityId" required className={input}>
            <option value="">Select…</option>
            {entities.map((en) => (
              <option key={en.id} value={en.id}>
                {en.code} — {en.display_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Child entity</span>
          <select name="childEntityId" required className={input}>
            <option value="">Select…</option>
            {entities.map((en) => (
              <option key={`c-${en.id}`} value={en.id}>
                {en.code} — {en.display_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Relationship type</span>
          <select name="relationshipType" className={input}>
            <option value="subsidiary">subsidiary</option>
            <option value="division">division</option>
            <option value="branch_entity">branch_entity</option>
            <option value="managed_entity">managed_entity</option>
            <option value="intercompany">intercompany</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Ownership % (optional)</span>
          <input name="ownershipPercentage" type="number" min={0} max={100} step={0.01} className={input} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Effective start (optional)</span>
          <input name="effectiveStartDate" type="date" className={input} />
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending || entities.length < 2} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
            {pending ? "Saving…" : "Create relationship"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function ConsolidationSnapshotForm({ workspace, groups }: { workspace: FinanceWorkspace; groups: Cg[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Generate consolidation snapshot</h2>
      <p className="text-xs text-neutral-500">
        Upserts by group + snapshot date. Pulls included entities from the consolidation view and optional AR/AP aging
        summaries when Pack 009 views exist.
      </p>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await generateConsolidationSnapshot({
              tenantId: workspace.tenantId,
              consolidationGroupId: String(fd.get("consolidationGroupId") ?? ""),
              snapshotDate: String(fd.get("snapshotDate") ?? today),
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
          <span className="text-neutral-500 text-xs">Consolidation group</span>
          <select name="consolidationGroupId" required className={input}>
            <option value="">Select…</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.group_code} — {g.group_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Snapshot date</span>
          <input name="snapshotDate" type="date" required defaultValue={today} className={input} />
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending || !groups.length} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
            {pending ? "Saving…" : "Generate / refresh snapshot"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function IntercompanyAccountForm({ workspace, entities }: { workspace: FinanceWorkspace; entities: Ent[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const others = entities.filter((e) => e.id !== workspace.entityId);
  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Add intercompany account mapping</h2>
      <p className="text-xs text-neutral-500">Maps entity {workspace.entityCode} to a counterparty entity (GL account links optional in schema).</p>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createIntercompanyAccount({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              counterpartyEntityId: String(fd.get("counterpartyEntityId") ?? ""),
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
          <span className="text-neutral-500 text-xs">Counterparty entity</span>
          <select name="counterpartyEntityId" required className={input}>
            <option value="">Select…</option>
            {others.map((en) => (
              <option key={en.id} value={en.id}>
                {en.code} — {en.display_name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={pending || !others.length} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black w-fit">
          {pending ? "Saving…" : "Create mapping"}
        </button>
      </form>
    </div>
  );
}

export function IntercompanyTransactionForm({ workspace, entities }: { workspace: FinanceWorkspace; entities: Ent[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const others = entities.filter((e) => e.id !== workspace.entityId);
  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Add intercompany transaction (draft)</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const dateRaw = String(fd.get("transactionDate") ?? "").trim();
            const res = await createIntercompanyTransaction({
              tenantId: workspace.tenantId,
              sourceEntityId: workspace.entityId,
              counterpartyEntityId: String(fd.get("counterpartyEntityId") ?? ""),
              transactionCode: String(fd.get("transactionCode") ?? "").trim(),
              transactionType: String(fd.get("transactionType") ?? "other") as
                | "chargeback"
                | "reimbursement"
                | "shared_service"
                | "allocation"
                | "other",
              transactionDate: dateRaw || undefined,
              amount: Number(fd.get("amount") ?? 0),
              memo: String(fd.get("memo") ?? "").trim() || undefined,
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
          <span className="text-neutral-500 text-xs">Counterparty entity</span>
          <select name="counterpartyEntityId" required className={input}>
            <option value="">Select…</option>
            {others.map((en) => (
              <option key={en.id} value={en.id}>
                {en.code} — {en.display_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Transaction code</span>
          <input name="transactionCode" required className={input} placeholder="IC-2026-0001" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Type</span>
          <select name="transactionType" className={input}>
            <option value="chargeback">chargeback</option>
            <option value="reimbursement">reimbursement</option>
            <option value="shared_service">shared_service</option>
            <option value="allocation">allocation</option>
            <option value="other">other</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Date</span>
          <input name="transactionDate" type="date" className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Amount</span>
          <input name="amount" type="number" step="0.01" defaultValue={0} className={input} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Memo</span>
          <input name="memo" className={input} />
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending || !others.length} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
            {pending ? "Saving…" : "Create draft"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function TenantActivationChecklistForm({ workspace }: { workspace: FinanceWorkspace }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Add tenant activation checklist</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createTenantActivationChecklist({
              tenantId: workspace.tenantId,
              checklistName: String(fd.get("checklistName") ?? "").trim(),
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
          <span className="text-neutral-500 text-xs">Checklist name</span>
          <input name="checklistName" required className={input} placeholder="Go-live readiness" />
        </label>
        <button type="submit" disabled={pending} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black w-fit">
          {pending ? "Saving…" : "Create checklist"}
        </button>
      </form>
    </div>
  );
}

export function TenantActivationTaskForm({
  workspace,
  checklists,
}: {
  workspace: FinanceWorkspace;
  checklists: ActivationChecklist[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Add activation task</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createTenantActivationTask({
              tenantId: workspace.tenantId,
              tenantActivationChecklistId: String(fd.get("tenantActivationChecklistId") ?? ""),
              taskCode: String(fd.get("taskCode") ?? "").trim(),
              taskName: String(fd.get("taskName") ?? "").trim(),
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
          <span className="text-neutral-500 text-xs">Checklist</span>
          <select name="tenantActivationChecklistId" required className={input}>
            <option value="">Select…</option>
            {checklists.map((c) => (
              <option key={c.id} value={c.id}>
                {c.checklist_name} ({c.activation_status})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Task code</span>
          <input name="taskCode" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Task name</span>
          <input name="taskName" required className={input} />
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending || !checklists.length} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
            {pending ? "Saving…" : "Add task"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function TenantFeatureFlagForm({ workspace, definitions }: { workspace: FinanceWorkspace; definitions: FeatureFlagDef[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Set tenant feature flag</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await upsertTenantFeatureFlag({
              tenantId: workspace.tenantId,
              featureFlagDefinitionId: String(fd.get("featureFlagDefinitionId") ?? ""),
              enabled: String(fd.get("enabled") ?? "false") === "true",
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
          <span className="text-neutral-500 text-xs">Flag definition</span>
          <select name="featureFlagDefinitionId" required className={input}>
            <option value="">Select…</option>
            {definitions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.flag_key} — {d.flag_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Enabled</span>
          <select name="enabled" className={input}>
            <option value="false">No</option>
            <option value="true">Yes</option>
          </select>
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending || !definitions.length} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
            {pending ? "Saving…" : "Save flag"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function TenantBootstrapRunForm({
  workspace,
  templates,
}: {
  workspace: FinanceWorkspace;
  templates: ProvisioningTemplate[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Start tenant bootstrap run</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const tpl = String(fd.get("provisioningTemplateId") ?? "").trim();
            const res = await startTenantBootstrapRun({
              tenantId: workspace.tenantId,
              provisioningTemplateId: tpl || undefined,
              runNotes: String(fd.get("runNotes") ?? "").trim() || undefined,
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
          <span className="text-neutral-500 text-xs">Provisioning template (optional)</span>
          <select name="provisioningTemplateId" className={input}>
            <option value="">None</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.template_code} — {t.template_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Run notes</span>
          <input name="runNotes" className={input} />
        </label>
        <button type="submit" disabled={pending} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black w-fit">
          {pending ? "Saving…" : "Start run"}
        </button>
      </form>
    </div>
  );
}

export function ClientPortalProfileForm({ workspace, customers }: { workspace: FinanceWorkspace; customers: CustomerOpt[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Add client portal profile</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createClientPortalProfile({
              tenantId: workspace.tenantId,
              customerId: String(fd.get("customerId") ?? ""),
              portalStatus: String(fd.get("portalStatus") ?? "inactive") as "inactive" | "active" | "suspended",
              allowInvoiceView: String(fd.get("allowInvoiceView") ?? "true") === "true",
              allowStatementView: String(fd.get("allowStatementView") ?? "true") === "true",
              allowPaymentSubmission: String(fd.get("allowPaymentSubmission") ?? "false") === "true",
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
          <span className="text-neutral-500 text-xs">Customer</span>
          <select name="customerId" required className={input}>
            <option value="">Select…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.customer_code} — {c.display_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Portal status</span>
          <select name="portalStatus" className={input}>
            <option value="inactive">inactive</option>
            <option value="active">active</option>
            <option value="suspended">suspended</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Allow invoice view</span>
          <select name="allowInvoiceView" className={input}>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Allow statement view</span>
          <select name="allowStatementView" className={input}>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Allow payment submission</span>
          <select name="allowPaymentSubmission" className={input}>
            <option value="false">No</option>
            <option value="true">Yes</option>
          </select>
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending || !customers.length} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
            {pending ? "Saving…" : "Create profile"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function TestSuiteForm({ workspace }: { workspace: FinanceWorkspace }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Add test suite</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createTestSuite({
              tenantId: workspace.tenantId,
              suiteCode: String(fd.get("suiteCode") ?? "").trim(),
              suiteName: String(fd.get("suiteName") ?? "").trim(),
              suiteCategory: String(fd.get("suiteCategory") ?? "integration") as
                | "unit"
                | "integration"
                | "rls"
                | "workflow"
                | "performance"
                | "release"
                | "recovery"
                | "other",
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
          <span className="text-neutral-500 text-xs">Suite code</span>
          <input name="suiteCode" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Suite name</span>
          <input name="suiteName" required className={input} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Category</span>
          <select name="suiteCategory" className={input}>
            <option value="integration">integration</option>
            <option value="rls">rls</option>
            <option value="workflow">workflow</option>
          </select>
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
            {pending ? "Saving…" : "Create suite"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function StartTestRunForm({ workspace, suites }: { workspace: FinanceWorkspace; suites: TestSuiteOpt[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Start test run</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await startTestRun({
              tenantId: workspace.tenantId,
              testSuiteId: String(fd.get("testSuiteId") ?? ""),
              runEnvironment: String(fd.get("runEnvironment") ?? "staging") as
                | "dev"
                | "staging"
                | "uat"
                | "production",
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
          <span className="text-neutral-500 text-xs">Test suite</span>
          <select name="testSuiteId" required className={input}>
            <option value="">Select…</option>
            {suites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.suite_code} — {s.suite_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Environment</span>
          <select name="runEnvironment" className={input}>
            <option value="dev">dev</option>
            <option value="staging">staging</option>
            <option value="uat">uat</option>
            <option value="production">production</option>
          </select>
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending || !suites.length} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
            {pending ? "Saving…" : "Start run"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function TestResultForm({ workspace, testRuns }: { workspace: FinanceWorkspace; testRuns: TestRunOpt[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Record test result</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createTestResult({
              tenantId: workspace.tenantId,
              testRunId: String(fd.get("testRunId") ?? ""),
              testCaseCode: String(fd.get("testCaseCode") ?? "").trim(),
              resultStatus: String(fd.get("resultStatus") ?? "passed") as "passed" | "failed" | "skipped",
              severity: String(fd.get("severity") ?? "normal") as "low" | "normal" | "high" | "critical",
              resultNotes: String(fd.get("resultNotes") ?? "").trim() || undefined,
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
          <span className="text-neutral-500 text-xs">Test run</span>
          <select name="testRunId" required className={input}>
            <option value="">Select…</option>
            {testRuns.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id.slice(0, 8)}… · {r.run_environment} · {r.run_status}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Case code</span>
          <input name="testCaseCode" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Result</span>
          <select name="resultStatus" className={input}>
            <option value="passed">passed</option>
            <option value="failed">failed</option>
            <option value="skipped">skipped</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Severity</span>
          <select name="severity" className={input}>
            <option value="normal">normal</option>
            <option value="low">low</option>
            <option value="high">high</option>
            <option value="critical">critical</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Notes</span>
          <input name="resultNotes" className={input} />
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending || !testRuns.length} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
            {pending ? "Saving…" : "Save result"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function ReleaseChecklistForm({
  workspace,
  releases,
}: {
  workspace: FinanceWorkspace;
  releases: ReleaseVersionOpt[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Add release checklist</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createReleaseChecklist({
              tenantId: workspace.tenantId,
              releaseVersionId: String(fd.get("releaseVersionId") ?? ""),
              checklistName: String(fd.get("checklistName") ?? "").trim(),
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
          <span className="text-neutral-500 text-xs">Release version</span>
          <select name="releaseVersionId" required className={input}>
            <option value="">Select…</option>
            {releases.map((r) => (
              <option key={r.id} value={r.id}>
                {r.release_code} — {r.release_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Checklist name</span>
          <input name="checklistName" required className={input} />
        </label>
        <button type="submit" disabled={pending || !releases.length} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black w-fit">
          {pending ? "Saving…" : "Create checklist"}
        </button>
      </form>
    </div>
  );
}

export function ReleaseTaskForm({
  workspace,
  checklists,
}: {
  workspace: FinanceWorkspace;
  checklists: ReleaseChecklistOpt[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Add release task</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createReleaseTask({
              tenantId: workspace.tenantId,
              releaseChecklistId: String(fd.get("releaseChecklistId") ?? ""),
              taskCode: String(fd.get("taskCode") ?? "").trim(),
              taskName: String(fd.get("taskName") ?? "").trim(),
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
          <span className="text-neutral-500 text-xs">Release checklist</span>
          <select name="releaseChecklistId" required className={input}>
            <option value="">Select…</option>
            {checklists.map((c) => (
              <option key={c.id} value={c.id}>
                {c.checklist_name} ({c.checklist_status})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Task code</span>
          <input name="taskCode" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Task name</span>
          <input name="taskName" required className={input} />
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending || !checklists.length} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
            {pending ? "Saving…" : "Add task"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function OperationalAlertForm({ workspace, entities }: { workspace: FinanceWorkspace; entities: Ent[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Record operational alert</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const ent = String(fd.get("entityId") ?? "").trim();
            const res = await createOperationalAlert({
              tenantId: workspace.tenantId,
              entityId: ent || undefined,
              moduleKey: String(fd.get("moduleKey") ?? "").trim(),
              alertCode: String(fd.get("alertCode") ?? "").trim(),
              alertSeverity: String(fd.get("alertSeverity") ?? "medium") as "low" | "medium" | "high" | "critical",
              alertMessage: String(fd.get("alertMessage") ?? "").trim(),
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
          <span className="text-neutral-500 text-xs">Entity (optional)</span>
          <select name="entityId" className={input}>
            <option value="">Tenant-wide</option>
            {entities.map((en) => (
              <option key={en.id} value={en.id}>
                {en.code} — {en.display_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Module key</span>
          <input name="moduleKey" required className={input} placeholder="reporting" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Alert code</span>
          <input name="alertCode" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Severity</span>
          <select name="alertSeverity" className={input}>
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
            <option value="critical">critical</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Message</span>
          <input name="alertMessage" required className={input} />
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
            {pending ? "Saving…" : "Create alert"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function JobRunStartForm({ workspace }: { workspace: FinanceWorkspace }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Record job run (started)</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await recordJobRunStart({
              tenantId: workspace.tenantId,
              jobKey: String(fd.get("jobKey") ?? "").trim(),
              jobCategory: String(fd.get("jobCategory") ?? "scheduler") as
                | "scheduler"
                | "integration"
                | "reporting"
                | "payroll"
                | "billing"
                | "recovery"
                | "other",
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
          <span className="text-neutral-500 text-xs">Job key</span>
          <input name="jobKey" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Category</span>
          <select name="jobCategory" className={input}>
            <option value="scheduler">scheduler</option>
            <option value="integration">integration</option>
            <option value="reporting">reporting</option>
            <option value="payroll">payroll</option>
            <option value="billing">billing</option>
            <option value="recovery">recovery</option>
            <option value="other">other</option>
          </select>
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
            {pending ? "Saving…" : "Record start"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function AuditReviewLogForm({ workspace, entities }: { workspace: FinanceWorkspace; entities: Ent[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Add audit review log</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const ent = String(fd.get("entityId") ?? "").trim();
            const dateRaw = String(fd.get("reviewDate") ?? "").trim();
            const res = await createAuditReviewLog({
              tenantId: workspace.tenantId,
              entityId: ent || undefined,
              reviewScope: String(fd.get("reviewScope") ?? "audit") as "audit" | "rls" | "release" | "security" | "other",
              reviewStatus: String(fd.get("reviewStatus") ?? "open") as "open" | "completed" | "closed",
              reviewDate: dateRaw || undefined,
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
          <span className="text-neutral-500 text-xs">Entity (optional)</span>
          <select name="entityId" className={input}>
            <option value="">Tenant-wide</option>
            {entities.map((en) => (
              <option key={en.id} value={en.id}>
                {en.code} — {en.display_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Scope</span>
          <select name="reviewScope" className={input}>
            <option value="audit">audit</option>
            <option value="rls">rls</option>
            <option value="release">release</option>
            <option value="security">security</option>
            <option value="other">other</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Status</span>
          <select name="reviewStatus" className={input}>
            <option value="open">open</option>
            <option value="completed">completed</option>
            <option value="closed">closed</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Review date</span>
          <input name="reviewDate" type="date" className={input} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Notes</span>
          <input name="notes" className={input} />
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
            {pending ? "Saving…" : "Create log"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function BackupVerificationRunForm({ workspace }: { workspace: FinanceWorkspace }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Start backup verification run</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const mk = String(fd.get("moduleKey") ?? "").trim();
            const res = await startBackupVerificationRun({
              tenantId: workspace.tenantId,
              runScope: String(fd.get("runScope") ?? "tenant") as "platform" | "tenant" | "module",
              moduleKey: mk || undefined,
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
          <span className="text-neutral-500 text-xs">Run scope</span>
          <select name="runScope" className={input}>
            <option value="tenant">tenant</option>
            <option value="module">module</option>
            <option value="platform">platform</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Module key (optional)</span>
          <input name="moduleKey" className={input} />
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
            {pending ? "Saving…" : "Start run"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function RestoreTestRunForm({ workspace }: { workspace: FinanceWorkspace }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Start restore test run</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const mk = String(fd.get("moduleKey") ?? "").trim();
            const res = await startRestoreTestRun({
              tenantId: workspace.tenantId,
              runScope: String(fd.get("runScope") ?? "tenant") as "platform" | "tenant" | "module",
              moduleKey: mk || undefined,
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
          <span className="text-neutral-500 text-xs">Run scope</span>
          <select name="runScope" className={input}>
            <option value="tenant">tenant</option>
            <option value="module">module</option>
            <option value="platform">platform</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Module key (optional)</span>
          <input name="moduleKey" className={input} />
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
            {pending ? "Saving…" : "Start run"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function DisasterRecoveryExerciseForm({ workspace }: { workspace: FinanceWorkspace }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Plan DR exercise</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const dateRaw = String(fd.get("exerciseDate") ?? "").trim();
            const res = await createDisasterRecoveryExercise({
              tenantId: workspace.tenantId,
              exerciseName: String(fd.get("exerciseName") ?? "").trim(),
              exerciseScope: String(fd.get("exerciseScope") ?? "tenant") as "platform" | "tenant" | "module",
              exerciseDate: dateRaw || undefined,
              lessonsLearned: String(fd.get("lessonsLearned") ?? "").trim() || undefined,
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
          <span className="text-neutral-500 text-xs">Exercise name</span>
          <input name="exerciseName" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Scope</span>
          <select name="exerciseScope" className={input}>
            <option value="tenant">tenant</option>
            <option value="module">module</option>
            <option value="platform">platform</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Exercise date</span>
          <input name="exerciseDate" type="date" className={input} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Lessons learned (optional)</span>
          <input name="lessonsLearned" className={input} />
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
            {pending ? "Saving…" : "Create exercise"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function ReleaseVersionForm({ workspace }: { workspace: FinanceWorkspace }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Add release version</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createReleaseVersion({
              tenantId: workspace.tenantId,
              releaseCode: String(fd.get("releaseCode") ?? "").trim(),
              releaseName: String(fd.get("releaseName") ?? "").trim(),
              releaseScope: String(fd.get("releaseScope") ?? "tenant") as "platform" | "tenant" | "module",
              targetModuleKey: String(fd.get("targetModuleKey") ?? "").trim() || undefined,
              releaseNotes: String(fd.get("releaseNotes") ?? "").trim() || undefined,
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
          <span className="text-neutral-500 text-xs">Release code</span>
          <input name="releaseCode" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Release name</span>
          <input name="releaseName" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Scope</span>
          <select name="releaseScope" className={input}>
            <option value="tenant">tenant</option>
            <option value="module">module</option>
            <option value="platform">platform</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Target module (optional)</span>
          <input name="targetModuleKey" className={input} placeholder="ar" />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Notes</span>
          <input name="releaseNotes" className={input} />
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
            {pending ? "Saving…" : "Create release"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function SystemHealthCheckForm({ workspace }: { workspace: FinanceWorkspace }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Record health check</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await upsertSystemHealthCheck({
              tenantId: workspace.tenantId,
              moduleKey: String(fd.get("moduleKey") ?? "").trim(),
              checkCode: String(fd.get("checkCode") ?? "").trim(),
              checkName: String(fd.get("checkName") ?? "").trim(),
              checkStatus: String(fd.get("checkStatus") ?? "healthy") as "healthy" | "warning" | "critical" | "unknown",
              statusMessage: String(fd.get("statusMessage") ?? "").trim() || undefined,
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
          <span className="text-neutral-500 text-xs">Module key</span>
          <input name="moduleKey" required className={input} placeholder="finance_core" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Check code</span>
          <input name="checkCode" required className={input} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Check name</span>
          <input name="checkName" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Status</span>
          <select name="checkStatus" className={input}>
            <option value="healthy">healthy</option>
            <option value="warning">warning</option>
            <option value="critical">critical</option>
            <option value="unknown">unknown</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Message</span>
          <input name="statusMessage" className={input} />
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
            {pending ? "Saving…" : "Upsert check"}
          </button>
        </div>
      </form>
    </div>
  );
}
