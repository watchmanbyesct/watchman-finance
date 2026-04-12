import {
  TrendingUp, TrendingDown, AlertCircle, CheckCircle2,
  ArrowRight, Clock, DollarSign, Users, FileText,
} from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Dashboard — Watchman Finance" };

// Placeholder stat cards — wired to real data once Pack 001 is migrated
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
  { label: "Pack 001 — Foundation schema applied",     complete: false, href: null },
  { label: "EST Holdings tenant created",               complete: false, href: null },
  { label: "ESCT entity created",                       complete: false, href: null },
  { label: "Chart of accounts seeded",                  complete: false, href: "/finance/accounts" },
  { label: "First fiscal period created",               complete: false, href: "/finance/periods" },
  { label: "First customer added",                      complete: false, href: "/finance/ar/customers" },
  { label: "First vendor added",                        complete: false, href: "/finance/ap/vendors" },
  { label: "Employee pay profiles configured",          complete: false, href: "/finance/payroll/profiles" },
  { label: "Bank account linked",                       complete: false, href: "/finance/banking/accounts" },
  { label: "First payroll run created",                 complete: false, href: "/finance/payroll/runs" },
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

  return (
    <div className="max-w-6xl space-y-8">

      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="wf-page-title">Finance Dashboard</h1>
          <p className="text-sm text-neutral-500 mt-1">{today} &mdash; EST Holdings / ESCT</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="wf-badge wf-badge-warning">
            <Clock size={10} className="mr-1" />
            Setup in Progress
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
              0 / {SETUP_CHECKLIST.length} complete
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
              {[
                "Finance Core", "AR", "AP", "Payroll", "Leave",
                "Banking", "Catalog", "Billing", "Inventory",
                "Reporting", "Budgeting", "Forecasting",
              ].map((mod) => (
                <div key={mod} className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400">{mod}</span>
                  <span className="wf-badge wf-badge-warning text-[10px] py-0.5">
                    Pending Schema
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Migration notice */}
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-5 py-4 flex items-start gap-3">
        <AlertCircle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-300">Migration Required</p>
          <p className="text-sm text-neutral-400 mt-1">
            Run the Pack 001 migration against your Supabase project before using any finance workflows.
            Once migrated and bootstrapped, this dashboard will populate with live data.
          </p>
          <code className="block mt-2 text-xs bg-black/40 border border-white/10 rounded px-3 py-2 text-amber-300 font-mono">
            npx supabase db push --project-ref YOUR_PROJECT_REF
          </code>
        </div>
      </div>
    </div>
  );
}
