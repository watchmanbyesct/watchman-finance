/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import {
  TrendingUp, AlertCircle, CheckCircle2,
  ArrowRight, Clock, DollarSign, Users, FileText,
  Receipt, CreditCard, Wallet, Sparkles, LayoutGrid, Building2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import { WATCHMAN_DEPLOYED_MIGRATION_PACK } from "@/lib/constants/watchman-migrations";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { PlatformSeedAllButton } from "@/components/finance/connected/platform-seed-all-button";
import {
  hasBankAccountLinked,
  getFinanceDashboardMetrics,
  hasChartOfAccountsSeeded,
  hasCustomersSeeded,
  hasEmployeePayProfilesConfigured,
  hasFiscalPeriodsSeeded,
  hasPayrollRunsCreated,
  hasVendorsSeeded,
  type FinanceDashboardMetrics,
} from "@/lib/finance/read-queries";

export const metadata = { title: "Dashboard — Watchman Finance" };

const PACK = WATCHMAN_DEPLOYED_MIGRATION_PACK;

type SetupChecklistItem = {
  label: string;
  complete: boolean;
  href: string | null;
  /** When incomplete and there is no href, shown instead of the generic migration label. */
  pendingNote?: string;
  pendingTitle?: string;
};

function formatUsd(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
}

type StatAccent = "emerald" | "rose" | "sky" | "amber";

type DashboardStat = {
  label: string;
  value: string;
  note: string;
  href: string;
  icon: LucideIcon;
  accent: StatAccent;
};

const ACCENT: Record<
  StatAccent,
  { border: string; gradient: string; iconWrap: string; icon: string }
> = {
  emerald: {
    border: "border-emerald-500/20 hover:border-emerald-400/40",
    gradient: "from-emerald-500/[0.12] via-emerald-500/[0.02] to-transparent",
    iconWrap:
      "border-emerald-400/25 bg-emerald-500/10 shadow-[0_0_28px_-8px_rgba(52,211,153,0.55)]",
    icon: "text-emerald-300",
  },
  rose: {
    border: "border-rose-500/20 hover:border-rose-400/40",
    gradient: "from-rose-500/[0.12] via-rose-500/[0.02] to-transparent",
    iconWrap:
      "border-rose-400/25 bg-rose-500/10 shadow-[0_0_28px_-8px_rgba(251,113,133,0.5)]",
    icon: "text-rose-300",
  },
  sky: {
    border: "border-sky-500/20 hover:border-sky-400/40",
    gradient: "from-sky-500/[0.12] via-sky-500/[0.02] to-transparent",
    iconWrap:
      "border-sky-400/25 bg-sky-500/10 shadow-[0_0_28px_-8px_rgba(56,189,248,0.5)]",
    icon: "text-sky-300",
  },
  amber: {
    border: "border-amber-500/25 hover:border-amber-400/45",
    gradient: "from-amber-500/[0.14] via-amber-500/[0.03] to-transparent",
    iconWrap:
      "border-amber-400/30 bg-amber-500/10 shadow-[0_0_28px_-8px_rgba(245,158,11,0.55)]",
    icon: "text-amber-300",
  },
};

const FALLBACK_STATS: DashboardStat[] = [
  {
    label: "AR Balance",
    value: "$0.00",
    note: "Sign in with workspace to load live AR",
    href: "/finance/ar/invoices",
    icon: Receipt,
    accent: "emerald",
  },
  {
    label: "AP Balance",
    value: "$0.00",
    note: "Sign in with workspace to load live AP",
    href: "/finance/ap/bills",
    icon: CreditCard,
    accent: "rose",
  },
  {
    label: "Open invoices",
    value: "—",
    note: "Entity-scoped issued / partial",
    href: "/finance/ar/invoices",
    icon: Wallet,
    accent: "sky",
  },
  {
    label: "Payroll",
    value: "—",
    note: "Pay groups & draft runs",
    href: "/finance/payroll/runs",
    icon: DollarSign,
    accent: "amber",
  },
];

function statsFromMetrics(m: FinanceDashboardMetrics): DashboardStat[] {
  const payrollValue =
    m.payGroupCount === 0
      ? "No pay groups"
      : m.draftPayrollRunLabel ?? "No draft runs";
  const payrollNote =
    m.payGroupCount === 0 ? "Create a pay group to run payroll" : `${m.payGroupCount} pay group(s)`;

  return [
    {
      label: "AR balance (open)",
      value: formatUsd(m.arBalanceDue),
      note: `${m.openInvoiceCount} open invoice(s)`,
      href: "/finance/ar/invoices",
      icon: Receipt,
      accent: "emerald",
    },
    {
      label: "AP balance (open)",
      value: formatUsd(m.apBalanceDue),
      note: `${m.openBillCount} open bill(s)`,
      href: "/finance/ap/bills",
      icon: CreditCard,
      accent: "rose",
    },
    {
      label: "Open invoices",
      value: String(m.openInvoiceCount),
      note: "Issued or partially paid",
      href: "/finance/ar/invoices",
      icon: Wallet,
      accent: "sky",
    },
    {
      label: "Payroll — next focus",
      value: payrollValue,
      note: payrollNote,
      href: "/finance/payroll/runs",
      icon: DollarSign,
      accent: "amber",
    },
  ];
}

function buildSetupChecklist(
  chartOfAccountsSeeded: boolean,
  fiscalPeriodsSeeded: boolean,
  employeePayProfilesConfigured: boolean,
  customerSeeded: boolean,
  vendorSeeded: boolean,
  bankAccountLinked: boolean,
  payrollRunCreated: boolean,
): SetupChecklistItem[] {
  return [
    { label: "Pack 001 — Foundation (GL, org, audit)", complete: PACK >= 1, href: null },
    { label: "Pack 002 — Integration staging", complete: PACK >= 2, href: "/finance/integration" },
    { label: "Pack 003 — AR & AP core", complete: PACK >= 3, href: "/finance/ar-ap" },
    { label: "Pack 004 — Payroll core", complete: PACK >= 4, href: "/finance/payroll" },
    { label: "Pack 005 — Leave & accruals", complete: PACK >= 5, href: "/finance/leave" },
    { label: "Pack 006 — Banking & reconciliation", complete: PACK >= 6, href: "/finance/banking" },
    { label: "Pack 007 — Catalog & billing", complete: PACK >= 7, href: "/finance/catalog-billing" },
    { label: "Pack 008 — Inventory & assets", complete: PACK >= 8, href: "/finance/inventory-assets" },
    { label: "Pack 009 — Reporting & close", complete: PACK >= 9, href: "/finance/reporting-hub" },
    { label: "Pack 010 — Budgeting & forecasting", complete: PACK >= 10, href: "/finance/planning-hub" },
    { label: "Pack 011 — Consolidation & commercial", complete: PACK >= 11, href: "/finance/consolidation-commercial-hub" },
    { label: "Pack 012 — Hardening & QA", complete: PACK >= 12, href: "/finance/operations-hub" },
    { label: "Pack 013 — Module permissions (007–012 surfaces)", complete: PACK >= 13, href: "/finance/pack-013" },
    { label: "Pack 014 — Tax, AR statements/collections, AP recurring", complete: PACK >= 14, href: "/finance/tax" },
    { label: "Pack 015 — Extension permissions (tax, collections, recurring)", complete: PACK >= 15, href: "/finance/pack-015" },
    { label: "Pack 016 — GL journal posting (manual batches)", complete: PACK >= 16, href: "/finance/journals" },
    { label: "Pack 017 — Subledger→GL, integration pipeline ops, reporting automation", complete: PACK >= 17, href: "/finance/gl/posting-bindings" },
    { label: "Pack 018 — GL reversals, AP→GL, payroll.reverse", complete: PACK >= 18, href: "/finance/gl/posting-bindings" },
    {
      label: "Packs 019–022 + 023 — Evidence, approvals, TB snapshots, API/webhook diagnostics & permissions",
      complete: PACK >= 23,
      href: "/finance/evidence",
    },
    {
      label: "Pack 024 — External accounting OAuth integration",
      complete: PACK >= 24,
      href: "/finance/integration/accounting-oauth",
    },
    {
      label: "Pack 025 — Chart of accounts + integration taxonomy & source-of-truth",
      complete: PACK >= 25,
      href: "/finance/accounts",
    },
    {
      label: "Pack 026 — Payroll desktop components (items, assignments, liabilities)",
      complete: PACK >= 26,
      href: "/finance/payroll/desktop",
    },
    {
      label: "Pack 027 — Integration account categories (metadata + seed)",
      complete: PACK >= 27,
      href: "/finance/accounts",
    },
    {
      label: "Pack 028 — Neutral integration naming",
      complete: PACK >= 28,
      href: "/finance/accounts",
    },
    { label: "ESCT Holdings tenant created", complete: true, href: null },
    {
      label: "Primary tenant entity — Enterprise Security Consulting and Training Inc.",
      complete: true,
      href: null,
    },
    { label: "Chart of accounts seeded", complete: chartOfAccountsSeeded, href: "/finance/accounts" },
    { label: "First fiscal period created", complete: fiscalPeriodsSeeded, href: "/finance/periods" },
    { label: "First customer added", complete: customerSeeded, href: "/finance/ar/customers" },
    { label: "First vendor added", complete: vendorSeeded, href: "/finance/ap/vendors" },
    { label: "Employee pay profiles configured", complete: employeePayProfilesConfigured, href: "/finance/payroll/profiles" },
    { label: "Bank account linked", complete: bankAccountLinked, href: "/finance/banking/accounts" },
    { label: "First payroll run created", complete: payrollRunCreated, href: "/finance/payroll/runs" },
  ];
}

const MODULE_SCHEMA_STATUS: { name: string; ready: boolean }[] = [
  { name: "Finance Core", ready: PACK >= 1 },
  { name: "Integration", ready: PACK >= 2 },
  { name: "AR", ready: PACK >= 3 },
  { name: "AP", ready: PACK >= 3 },
  { name: "Payroll", ready: PACK >= 4 },
  { name: "Leave", ready: PACK >= 5 },
  { name: "Banking", ready: PACK >= 6 },
  { name: "Catalog", ready: PACK >= 7 },
  { name: "Billing", ready: PACK >= 7 },
  { name: "Inventory", ready: PACK >= 8 },
  { name: "Reporting", ready: PACK >= 9 },
  { name: "Budgeting & forecasting", ready: PACK >= 10 },
  { name: "Consolidation", ready: PACK >= 11 },
  { name: "Operations & QA", ready: PACK >= 12 },
  { name: "Pack 013 — Granular module permissions", ready: PACK >= 13 },
  { name: "Tax & statutory (shells)", ready: PACK >= 14 },
  { name: "GL journal posting", ready: PACK >= 16 },
  { name: "Subledger GL & reporting automation", ready: PACK >= 17 },
  { name: "GL reversals & AP subledger", ready: PACK >= 18 },
  { name: "Evidence, approvals, TB cache & integration diagnostics", ready: PACK >= 23 },
  { name: "External accounting OAuth (Pack 002)", ready: PACK >= 24 },
  { name: "Integration account taxonomy & source of truth", ready: PACK >= 25 },
  { name: "Desktop payroll items & liabilities", ready: PACK >= 26 },
  { name: "Integration account category metadata", ready: PACK >= 27 },
  { name: "Neutral integration schema naming", ready: PACK >= 28 },
];

const QUICK_LINKS = [
  ...(PACK >= 16
    ? [{ label: "GL journal", href: "/finance/journals", icon: FileText } as const]
    : []),
  { label: "Create Invoice",     href: "/finance/ar/invoices",          icon: FileText },
  { label: "Enter Bill",         href: "/finance/ap/bills",             icon: FileText },
  { label: "Run Payroll",        href: "/finance/payroll/runs",         icon: DollarSign },
  { label: "Reconcile Bank",     href: "/finance/banking/reconciliations", icon: CheckCircle2 },
  { label: "View Reports",       href: "/finance/reporting/reports",    icon: TrendingUp },
  { label: "Manage Employees",   href: "/finance/payroll/profiles",     icon: Users },
];

export default async function FinanceDashboardPage() {
  const workspace = await resolveFinanceWorkspace();
  let metrics: FinanceDashboardMetrics | null = null;
  let chartOfAccountsSeeded = false;
  let fiscalPeriodsSeeded = false;
  let employeePayProfilesConfigured = false;
  let customerSeeded = false;
  let vendorSeeded = false;
  let bankAccountLinked = false;
  let payrollRunCreated = false;
  if (workspace) {
    try {
      metrics = await getFinanceDashboardMetrics(workspace.tenantId, workspace.entityId);
    } catch {
      metrics = null;
    }
    try {
      chartOfAccountsSeeded = await hasChartOfAccountsSeeded(workspace.tenantId, workspace.entityId);
    } catch {
      chartOfAccountsSeeded = false;
    }
    try {
      fiscalPeriodsSeeded = await hasFiscalPeriodsSeeded(workspace.tenantId, workspace.entityId);
    } catch {
      fiscalPeriodsSeeded = false;
    }
    try {
      employeePayProfilesConfigured = await hasEmployeePayProfilesConfigured(
        workspace.tenantId,
        workspace.entityId,
      );
    } catch {
      employeePayProfilesConfigured = false;
    }
    try {
      customerSeeded = await hasCustomersSeeded(workspace.tenantId, workspace.entityId);
    } catch {
      customerSeeded = false;
    }
    try {
      vendorSeeded = await hasVendorsSeeded(workspace.tenantId, workspace.entityId);
    } catch {
      vendorSeeded = false;
    }
    try {
      bankAccountLinked = await hasBankAccountLinked(workspace.tenantId, workspace.entityId);
    } catch {
      bankAccountLinked = false;
    }
    try {
      payrollRunCreated = await hasPayrollRunsCreated(workspace.tenantId, workspace.entityId);
    } catch {
      payrollRunCreated = false;
    }
  }

  const stats = metrics ? statsFromMetrics(metrics) : FALLBACK_STATS;
  const setupChecklist = buildSetupChecklist(
    chartOfAccountsSeeded,
    fiscalPeriodsSeeded,
    employeePayProfilesConfigured,
    customerSeeded,
    vendorSeeded,
    bankAccountLinked,
    payrollRunCreated,
  );
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const checklistDone = setupChecklist.filter((i) => i.complete).length;
  const packLabel = String(WATCHMAN_DEPLOYED_MIGRATION_PACK).padStart(3, "0");
  const checklistPct = Math.round((checklistDone / setupChecklist.length) * 100);
  const modulesLive = MODULE_SCHEMA_STATUS.filter((m) => m.ready).length;

  return (
    <div className="max-w-6xl space-y-8 pb-4">
      {/* Hero */}
      <section
        className="relative overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-br from-[#1e1a12] via-[#151311] to-[#0c0c0c]
                   px-5 py-7 sm:px-8 sm:py-9 shadow-[0_24px_80px_-32px_rgba(245,158,11,0.35)]"
      >
        <div
          className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-amber-500/[0.14] blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-32 left-0 h-56 w-56 rounded-full bg-emerald-600/[0.08] blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2240%22%20height%3D%2240%22%3E%3Cpath%20d%3D%22M0%20h40%20M40%200%20v40%22%20fill%3D%22none%22%20stroke%3D%22rgba(255%2C255%2C255%2C0.04)%22%20stroke-width%3D%221%22%2F%3E%3C%2Fsvg%3E')] opacity-80"
          aria-hidden
        />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200/90">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" aria-hidden />
              {workspace ? "Live workspace" : "Getting started"}
            </p>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-neutral-50 sm:text-4xl">
              Finance Dashboard
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-neutral-400">
              <span className="text-neutral-300">{today}</span>
              <span className="mx-2 text-neutral-600">·</span>
              {workspace ? (
                <>
                  <Building2 className="mr-1.5 inline-block h-3.5 w-3.5 text-amber-500/80 align-[-2px]" aria-hidden />
                  {workspace.tenantDisplayName}
                  <span className="text-neutral-600"> / </span>
                  <span className="text-neutral-300">{workspace.entityDisplayName}</span>
                </>
              ) : (
                <>ESCT Holdings — connect workspace for live KPIs</>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="wf-badge wf-badge-success shadow-[0_0_20px_-6px_rgba(34,197,94,0.45)]">
              <CheckCircle2 size={10} className="mr-1" />
              Packs 001–{packLabel}
            </span>
            <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-xs text-neutral-400 backdrop-blur-sm">
              {modulesLive}/{MODULE_SCHEMA_STATUS.length} modules live
            </span>
          </div>
        </div>
      </section>

      {/* KPI tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const a = ACCENT[stat.accent];
          const Icon = stat.icon;
          return (
            <Link
              href={stat.href}
              key={stat.label}
              className={clsx(
                "group relative overflow-hidden rounded-xl border bg-[#141414]/90 p-5 transition-all duration-300",
                "motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-[0_20px_50px_-24px_rgba(0,0,0,0.85)]",
                a.border,
              )}
            >
              <div
                className={clsx(
                  "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-90",
                  a.gradient,
                )}
                aria-hidden
              />
              <div className="relative flex gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                    {stat.label}
                  </p>
                  <p className="mt-2 font-display text-2xl font-semibold tabular-nums tracking-tight text-neutral-50 sm:text-[1.65rem]">
                    {stat.value}
                  </p>
                  <p className="mt-1.5 text-xs leading-snug text-neutral-500">{stat.note}</p>
                  <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-neutral-500 transition-colors group-hover:text-amber-400">
                    Open
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
                <div
                  className={clsx(
                    "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border",
                    a.iconWrap,
                  )}
                >
                  <Icon className={clsx("h-5 w-5", a.icon)} strokeWidth={1.75} aria-hidden />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-white/10 bg-gradient-to-b from-[#181818] to-[#121212] p-5 sm:p-6 shadow-xl shadow-black/40">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="wf-section-title">Platform setup</h2>
              <p className="mt-1 text-xs text-neutral-500">Migrations, tenant, and go-live tasks</p>
            </div>
            <div className="w-full sm:w-52">
              <div className="mb-1 flex justify-between text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                <span>Progress</span>
                <span className="tabular-nums text-amber-500/90">{checklistPct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-white/[0.06]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-700 via-amber-500 to-amber-300 transition-[width] duration-500"
                  style={{ width: `${checklistPct}%` }}
                />
              </div>
            </div>
          </div>

          {workspace ? (
            <div className="mb-4">
              <PlatformSeedAllButton tenantId={workspace.tenantId} entityId={workspace.entityId} />
            </div>
          ) : null}

          <div className="max-h-[min(70vh,520px)] space-y-1 overflow-y-auto pr-1 [-webkit-overflow-scrolling:touch]">
            {setupChecklist.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-white/[0.04]"
              >
                <div
                  className={clsx(
                    "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border",
                    item.complete
                      ? "border-green-500/45 bg-green-500/15 shadow-[0_0_12px_-4px_rgba(34,197,94,0.5)]"
                      : "border-white/15 bg-white/[0.04]",
                  )}
                >
                  {item.complete && <CheckCircle2 size={11} className="text-green-400" />}
                </div>
                <span
                  className={clsx(
                    "min-w-0 flex-1 text-sm leading-snug",
                    item.complete ? "text-neutral-500 line-through decoration-neutral-600" : "text-neutral-200",
                  )}
                >
                  {item.label}
                </span>
                {!item.complete && item.href && (
                  <Link
                    href={item.href}
                    className="flex flex-shrink-0 items-center gap-0.5 rounded-md px-2 py-1 text-xs font-medium text-amber-500 transition-colors hover:bg-amber-500/10 hover:text-amber-400"
                  >
                    Set up <ArrowRight size={10} />
                  </Link>
                )}
                {!item.complete && !item.href && (
                  <span
                    className="flex max-w-[10.5rem] flex-shrink-0 items-center gap-1 text-right text-[11px] leading-snug text-neutral-500"
                    title={item.pendingTitle}
                  >
                    <AlertCircle size={10} className="flex-shrink-0 text-neutral-600" />
                    {item.pendingNote ?? "Requires migration"}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-[#141414] p-5 shadow-lg shadow-black/35">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="wf-section-title">Quick actions</h2>
              <LayoutGrid className="h-4 w-4 text-neutral-600" aria-hidden />
            </div>
            <div className="grid grid-cols-1 gap-2">
              {QUICK_LINKS.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="group flex items-center gap-3 rounded-lg border border-transparent bg-white/[0.03] px-3 py-2.5 transition-all hover:border-amber-500/20 hover:bg-amber-500/[0.06]"
                  >
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-white/10 bg-gradient-to-br from-white/[0.08] to-transparent text-amber-500/90 transition-colors group-hover:border-amber-500/30 group-hover:text-amber-400">
                      <Icon size={16} strokeWidth={1.75} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-medium text-neutral-200 group-hover:text-neutral-50">
                      {link.label}
                    </span>
                    <ArrowRight
                      size={14}
                      className="flex-shrink-0 text-neutral-600 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-400"
                      aria-hidden
                    />
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-[#1a1610] to-[#121212] p-5 shadow-[0_20px_50px_-28px_rgba(245,158,11,0.25)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="wf-section-title">Module status</h2>
              <span className="text-[11px] font-medium uppercase tracking-wider text-amber-500/80">
                Schema
              </span>
            </div>
            <div className="grid max-h-64 grid-cols-1 gap-x-3 gap-y-2 overflow-y-auto text-[11px] sm:grid-cols-2">
              {MODULE_SCHEMA_STATUS.map(({ name, ready }) => (
                <div
                  key={name}
                  className="flex items-center justify-between gap-2 rounded-md border border-white/[0.06] bg-black/20 px-2.5 py-1.5"
                >
                  <span className="min-w-0 truncate text-neutral-400" title={name}>
                    {name}
                  </span>
                  <span
                    className={clsx(
                      "h-1.5 w-1.5 flex-shrink-0 rounded-full",
                      ready ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" : "bg-amber-600/80",
                    )}
                    title={ready ? "Live" : "Pending"}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-r from-[#161616] via-[#131313] to-[#161616] px-5 py-4 sm:px-6">
        <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-amber-500/60 via-amber-500/30 to-transparent" aria-hidden />
        <div className="relative flex items-start gap-4 pl-2 sm:pl-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-white/10 bg-amber-500/10 text-amber-500">
            <Clock size={18} strokeWidth={1.75} aria-hidden />
          </div>
          <div className="min-w-0 pt-0.5">
            <p className="text-sm font-semibold text-neutral-100">Operational next steps</p>
            <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">
              KPI tiles use live invoice and bill balances when a finance workspace is resolved. Bump{" "}
              <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-xs text-neutral-300">
                WATCHMAN_DEPLOYED_MIGRATION_PACK
              </code>{" "}
              in{" "}
              <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-xs text-neutral-300">
                lib/constants/watchman-migrations.ts
              </code>{" "}
              when you apply packs. For ESCT Holdings / ESCT entity bootstrap, run migrations through Pack 001 onward, then{" "}
              <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-xs text-neutral-300">
                npm run greenfield:bootstrap
              </code>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
