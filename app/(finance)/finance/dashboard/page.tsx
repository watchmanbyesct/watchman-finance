import {
  TrendingUp, AlertCircle, CheckCircle2,
  ArrowRight, Clock, DollarSign, Users, FileText,
} from "lucide-react";
import Link from "next/link";
import { WATCHMAN_DEPLOYED_MIGRATION_PACK } from "@/lib/constants/watchman-migrations";

export const metadata = { title: "Dashboard — Watchman Finance" };

const PACK = WATCHMAN_DEPLOYED_MIGRATION_PACK;

// Placeholder stat cards — replace with live queries when reporting is wired
const STATS = [
  {
    label: "AR Balance",
    value: "$0.00",
    change: null,
    trend: null,
    note: "Awaiting AR data",
    href: "/finance/ar/invoices",
  },
  {
    label: "AP Balance",
    value: "$0.00",
    change: null,
    trend: null,
    note: "Awaiting AP data",
    href: "/finance/ap/bills",
  },
  {
    label: "Open Invoices",
    value: "0",
    change: null,
    trend: null,
    note: "No open invoices",
    href: "/finance/ar/invoices",
  },
  {
    label: "Payroll — Next Run",
    value: "Not Configured",
    change: null,
    trend: null,
    note: "Set up a pay group",
    href: "/finance/payroll/profiles",
  },
];

const SETUP_CHECKLIST = [
  { label: "Pack 001 — Foundation (GL, org, audit)", complete: PACK >= 1, href: null },
  { label: "Pack 002 — Integration staging", complete: PACK >= 2, href: null },
  { label: "Pack 003 — AR & AP core", complete: PACK >= 3, href: null },
  { label: "Pack 004 — Payroll core", complete: PACK >= 4, href: null },
  { label: "Pack 005 — Leave & accruals", complete: PACK >= 5, href: null },
  { label: "Pack 006 — Banking & reconciliation", complete: PACK >= 6, href: null },
  { label: "Pack 007 — Catalog & billing", complete: PACK >= 7, href: null },
  { label: "Pack 008 — Inventory & assets", complete: PACK >= 8, href: null },
  { label: "Pack 009 — Reporting & close", complete: PACK >= 9, href: null },
  { label: "Pack 010 — Budgeting & forecasting", complete: PACK >= 10, href: null },
  { label: "Pack 011 — Consolidation & commercial", complete: PACK >= 11, href: null },
  { label: "Pack 012 — Hardening & QA", complete: PACK >= 12, href: null },
  { label: "EST Holdings tenant created", complete: false, href: null },
  { label: "ESCT entity created", complete: false, href: null },
  { label: "Chart of accounts seeded", complete: false, href: "/finance/accounts" },
  { label: "First fiscal period created", complete: false, href: "/finance/periods" },
  { label: "First customer added", complete: false, href: "/finance/ar/customers" },
  { label: "First vendor added", complete: false, href: "/finance/ap/vendors" },
  { label: "Employee pay profiles configured", complete: false, href: "/finance/payroll/profiles" },
  { label: "Bank account linked", complete: false, href: "/finance/banking/accounts" },
  { label: "First payroll run created", complete: false, href: "/finance/payroll/runs" },
];

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
];

const QUICK_LINKS = [
  { label: "Create Invoice",     href: "/finance/ar/invoices",          icon: FileText },
  { label: "Enter Bill",         href: "/finance/ap/bills",             icon: FileText },
  { label: "Run Payroll",        href: "/finance/payroll/runs",         icon: DollarSign },
  { label: "Reconcile Bank",     href: "/finance/banking/reconciliations", icon: CheckCircle2 },
  { label: "View Reports",       href: "/finance/reporting/reports",    icon: TrendingUp },
  { label: "Manage Employees",   href: "/finance/payroll/profiles",     icon: Users },
];

export default function FinanceDashboardPage() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const checklistDone = SETUP_CHECKLIST.filter((i) => i.complete).length;
  const packLabel = String(WATCHMAN_DEPLOYED_MIGRATION_PACK).padStart(3, "0");

  return (
    <div className="max-w-6xl space-y-8">

      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="wf-page-title">Finance Dashboard</h1>
          <p className="text-sm text-neutral-500 mt-1">{today} &mdash; EST Holdings / ESCT</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="wf-badge wf-badge-success">
            <CheckCircle2 size={10} className="mr-1" />
            Packs 001–{packLabel} applied
          </span>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((stat) => (
          <Link href={stat.href} key={stat.label} className="wf-card group hover:border-white/20 transition-colors">
            <div className="wf-stat">
              <p className="wf-stat-label">{stat.label}</p>
              <p className="wf-stat-value mt-1">{stat.value}</p>
              <p className="text-xs text-neutral-600 mt-1">{stat.note}</p>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs text-neutral-600 group-hover:text-amber-500 transition-colors">
              View <ArrowRight size={10} />
            </div>
          </Link>
        ))}
      </div>

      {/* Body grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Setup checklist — spans 2 cols */}
        <div className="lg:col-span-2 wf-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="wf-section-title">Platform Setup Checklist</h2>
            <span className="text-xs text-neutral-500">
              {checklistDone} / {SETUP_CHECKLIST.length} complete
            </span>
          </div>

          <div className="space-y-2.5">
            {SETUP_CHECKLIST.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 py-1"
              >
                <div className={`
                  w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center
                  ${item.complete
                    ? "bg-green-500/20 border border-green-500/40"
                    : "border border-white/15 bg-white/3"
                  }
                `}>
                  {item.complete && <CheckCircle2 size={10} className="text-green-400" />}
                </div>
                <span className={`text-sm flex-1 ${item.complete ? "text-neutral-500 line-through" : "text-neutral-300"}`}>
                  {item.label}
                </span>
                {!item.complete && item.href && (
                  <Link
                    href={item.href}
                    className="text-xs text-amber-500 hover:text-amber-400 transition-colors flex items-center gap-0.5"
                  >
                    Set up <ArrowRight size={9} />
                  </Link>
                )}
                {!item.complete && !item.href && (
                  <span className="text-xs text-neutral-600 flex items-center gap-0.5">
                    <AlertCircle size={9} /> Requires migration
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Quick links */}
        <div className="space-y-4">
          <div className="wf-card">
            <h2 className="wf-section-title mb-4">Quick Actions</h2>
            <div className="space-y-1.5">
              {QUICK_LINKS.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md
                               text-sm text-neutral-300 hover:text-neutral-100
                               hover:bg-white/5 transition-colors group"
                  >
                    <Icon size={13} className="text-neutral-500 group-hover:text-amber-400 transition-colors flex-shrink-0" />
                    {link.label}
                    <ArrowRight size={11} className="ml-auto text-neutral-700 group-hover:text-neutral-400 transition-colors" />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Module status */}
          <div className="wf-card-gold">
            <h2 className="wf-section-title mb-3">Module Status</h2>
            <div className="space-y-2">
              {MODULE_SCHEMA_STATUS.map(({ name, ready }) => (
                <div key={name} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-neutral-400">{name}</span>
                  {ready ? (
                    <span className="wf-badge wf-badge-success text-[10px] py-0.5">Schema live</span>
                  ) : (
                    <span className="wf-badge wf-badge-warning text-[10px] py-0.5">Migration pending</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Next steps */}
      <div className="rounded-lg border border-white/10 bg-white/[0.03] px-5 py-4 flex items-start gap-3">
        <Clock size={16} className="text-neutral-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-neutral-200">Operational next steps</p>
          <p className="text-sm text-neutral-500 mt-1">
            SQL through Pack {packLabel} is reflected in the UI. Finish the checklist (tenant, COA, master
            data) and connect each workspace to server actions as workflows mature. Bump{" "}
            <code className="text-xs text-neutral-400">WATCHMAN_DEPLOYED_MIGRATION_PACK</code> in{" "}
            <code className="text-xs text-neutral-400">lib/constants/watchman-migrations.ts</code> whenever
            you apply additional packs so module banners stay accurate.
          </p>
        </div>
      </div>
    </div>
  );
}
