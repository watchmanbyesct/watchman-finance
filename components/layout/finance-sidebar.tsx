"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, BookOpen, Users, Building2, FileText,
  Receipt, CreditCard, Wallet, Briefcase, CalendarClock,
  Landmark, Package, Tag, Zap, BarChart3, TrendingUp,
  ShieldCheck, Settings, ChevronRight, Layers, Activity,
  Plug, MapPin, FileStack, ClipboardList, History, List, ArrowLeftRight,
  LayoutGrid, DollarSign, Scale, Sparkles, AlertTriangle, Gauge, GitCompare,
  GitBranch, Link2, Flag, Rocket, UserCircle, FileCode, PieChart,
  Beaker, PlayCircle, ListChecks, Bell, Cpu, BookMarked, Database, RotateCcw, Mountain,
  Percent, FileCheck2, ClipboardCheck, Radio, Calculator,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard",       href: "/finance/dashboard",       icon: LayoutDashboard },
      { label: "Pack 013 permissions", href: "/finance/pack-013", icon: ShieldCheck },
      { label: "Pack 015 extensions", href: "/finance/pack-015", icon: Link2 },
    ],
  },
  {
    title: "Integration (Pack 002)",
    items: [
      { label: "Pack 002 overview", href: "/finance/integration", icon: Plug },
      { label: "External accounting (OAuth)", href: "/finance/integration/accounting-oauth", icon: Calculator },
      { label: "Staging — Employees", href: "/finance/integration/staging/employees", icon: Users },
      { label: "Staging — Time", href: "/finance/integration/staging/time", icon: CalendarClock },
      { label: "Staging — Service events", href: "/finance/integration/staging/service-events", icon: Zap },
      { label: "Org — Branches", href: "/finance/integration/org/branches", icon: Building2 },
      { label: "Org — Departments", href: "/finance/integration/org/departments", icon: Briefcase },
      { label: "Org — Locations", href: "/finance/integration/org/locations", icon: MapPin },
      { label: "Event pipeline", href: "/finance/integration/pipeline", icon: Activity },
    ],
  },
  {
    title: "Accounting",
    items: [
      { label: "Chart of Accounts", href: "/finance/accounts",       icon: BookOpen },
      { label: "Journal Entries",   href: "/finance/journals",       icon: FileText },
      { label: "GL posting bindings", href: "/finance/gl/posting-bindings", icon: Link2 },
      { label: "Fiscal Periods",    href: "/finance/periods",        icon: CalendarClock },
    ],
  },
  {
    title: "AR & AP (Pack 003)",
    items: [
      { label: "Pack 003 overview", href: "/finance/ar-ap", icon: FileStack },
      { label: "Customers", href: "/finance/ar/customers", icon: Users },
      { label: "Customer sites", href: "/finance/ar/customer-sites", icon: MapPin },
      { label: "Invoices", href: "/finance/ar/invoices", icon: Receipt },
      { label: "Credit memos", href: "/finance/ar/credit-memos", icon: FileText },
      { label: "Statement runs", href: "/finance/ar/statements", icon: FileStack },
      { label: "Collections", href: "/finance/ar/collections", icon: ClipboardList },
      { label: "Payments In", href: "/finance/ar/payments", icon: Wallet },
      { label: "Vendors", href: "/finance/ap/vendors", icon: Building2 },
      { label: "Bills", href: "/finance/ap/bills", icon: FileText },
      { label: "Recurring charges", href: "/finance/ap/recurring", icon: CalendarClock },
      { label: "Payments Out", href: "/finance/ap/payments", icon: CreditCard },
    ],
  },
  {
    title: "Tax & payroll pay (Pack 014)",
    items: [
      { label: "Pack 014 overview", href: "/finance/tax", icon: Percent },
      { label: "Tax jurisdictions", href: "/finance/tax/jurisdictions", icon: MapPin },
      { label: "Employer tax profiles", href: "/finance/tax/employer-profiles", icon: Briefcase },
      { label: "Tax liabilities", href: "/finance/tax/liabilities", icon: DollarSign },
      { label: "Filing periods", href: "/finance/tax/filing-periods", icon: CalendarClock },
      { label: "Compliance tasks", href: "/finance/tax/compliance-tasks", icon: ListChecks },
      { label: "Direct deposit batches", href: "/finance/tax/direct-deposit", icon: Wallet },
    ],
  },
  {
    title: "Payroll (Pack 004)",
    items: [
      { label: "Pack 004 overview", href: "/finance/payroll", icon: FileStack },
      { label: "Pay groups", href: "/finance/payroll/groups", icon: Layers },
      { label: "Pay periods", href: "/finance/payroll/periods", icon: CalendarClock },
      { label: "Pay profiles", href: "/finance/payroll/profiles", icon: Briefcase },
      { label: "Payroll runs", href: "/finance/payroll/runs", icon: Zap },
      { label: "Pay statements", href: "/finance/payroll/statements", icon: FileText },
    ],
  },
  {
    title: "Leave (Pack 005)",
    items: [
      { label: "Pack 005 overview", href: "/finance/leave", icon: FileStack },
      { label: "Leave types", href: "/finance/leave/types", icon: Tag },
      { label: "Leave policies", href: "/finance/leave/policies", icon: FileText },
      { label: "Leave requests", href: "/finance/leave/requests", icon: ClipboardList },
      { label: "Balance ledger", href: "/finance/leave/balances", icon: History },
    ],
  },
  {
    title: "Banking (Pack 006)",
    items: [
      { label: "Pack 006 overview", href: "/finance/banking", icon: FileStack },
      { label: "Bank accounts", href: "/finance/banking/accounts", icon: Landmark },
      { label: "Transactions", href: "/finance/banking/transactions", icon: List },
      { label: "Reconciliations", href: "/finance/banking/reconciliations", icon: ShieldCheck },
      { label: "Transfers", href: "/finance/banking/transfers", icon: ArrowLeftRight },
    ],
  },
  {
    title: "Catalog & billing (Pack 007)",
    items: [
      { label: "Pack 007 overview", href: "/finance/catalog-billing", icon: FileStack },
      { label: "Catalog items", href: "/finance/catalog/items", icon: LayoutGrid },
      { label: "Catalog pricing", href: "/finance/catalog/pricing", icon: DollarSign },
      { label: "Billing rules", href: "/finance/billing/rules", icon: Scale },
      { label: "Billable candidates", href: "/finance/billing/candidates", icon: Sparkles },
      { label: "Billing exceptions", href: "/finance/billing/exceptions", icon: AlertTriangle },
    ],
  },
  {
    title: "Inventory (Pack 008)",
    items: [
      { label: "Pack 008 overview", href: "/finance/inventory-assets", icon: FileStack },
      { label: "Inventory items", href: "/finance/inventory/items", icon: Package },
      { label: "Stock", href: "/finance/inventory/stock", icon: Layers },
      { label: "Issues", href: "/finance/inventory/issues", icon: Zap },
      { label: "Assets", href: "/finance/inventory/assets", icon: Building2 },
    ],
  },
  {
    title: "Reporting (Pack 009)",
    items: [
      { label: "Pack 009 overview", href: "/finance/reporting-hub", icon: FileStack },
      { label: "Reports", href: "/finance/reporting/reports", icon: BarChart3 },
      { label: "Dashboards", href: "/finance/reporting/dashboards", icon: LayoutDashboard },
      { label: "KPI definitions", href: "/finance/reporting/kpis", icon: Gauge },
      { label: "Period close", href: "/finance/reporting/close", icon: CalendarClock },
    ],
  },
  {
    title: "Planning (Pack 010)",
    items: [
      { label: "Pack 010 overview", href: "/finance/planning-hub", icon: FileStack },
      { label: "Budgets", href: "/finance/planning/budgets", icon: TrendingUp },
      { label: "Forecasts", href: "/finance/planning/forecasts", icon: TrendingUp },
      { label: "Variance snapshots", href: "/finance/planning/variance", icon: GitCompare },
    ],
  },
  {
    title: "Consolidation & commercial (Pack 011)",
    items: [
      { label: "Pack 011 overview", href: "/finance/consolidation-commercial-hub", icon: FileStack },
      { label: "Consolidation groups", href: "/finance/consolidation/groups", icon: Layers },
      { label: "Entity relationships", href: "/finance/consolidation/relationships", icon: GitBranch },
      { label: "Consolidation snapshots", href: "/finance/consolidation/snapshots", icon: PieChart },
      { label: "IC account mappings", href: "/finance/consolidation/intercompany-accounts", icon: Link2 },
      { label: "IC transactions", href: "/finance/consolidation/intercompany-transactions", icon: ArrowLeftRight },
      { label: "Provisioning templates", href: "/finance/commercial/provisioning-templates", icon: FileCode },
      { label: "Tenant bootstrap", href: "/finance/commercial/bootstrap", icon: Rocket },
      { label: "Feature flags", href: "/finance/commercial/feature-flags", icon: Flag },
      { label: "Tenant activation", href: "/finance/commercial/activation", icon: ClipboardList },
      { label: "Client portal", href: "/finance/commercial/client-portal", icon: UserCircle },
    ],
  },
  {
    title: "Operations & QA (Pack 012)",
    items: [
      { label: "Pack 012 overview", href: "/finance/operations-hub", icon: FileStack },
      { label: "System health", href: "/finance/operations/health", icon: ShieldCheck },
      { label: "Test suites", href: "/finance/operations/test-suites", icon: Beaker },
      { label: "Test runs", href: "/finance/operations/test-runs", icon: PlayCircle },
      { label: "Test results", href: "/finance/operations/test-results", icon: ListChecks },
      { label: "Releases", href: "/finance/operations/releases", icon: Activity },
      { label: "Release checklists", href: "/finance/operations/release-checklists", icon: ClipboardList },
      { label: "Release tasks", href: "/finance/operations/release-tasks", icon: List },
      { label: "Operational alerts", href: "/finance/operations/alerts", icon: Bell },
      { label: "Job runs", href: "/finance/operations/jobs", icon: Cpu },
      { label: "Audit reviews", href: "/finance/operations/audit-reviews", icon: BookMarked },
      { label: "Backup verification", href: "/finance/operations/backup-verification", icon: Database },
      { label: "Restore tests", href: "/finance/operations/restore-tests", icon: RotateCcw },
      { label: "DR exercises", href: "/finance/operations/dr-exercises", icon: Mountain },
    ],
  },
  {
    title: "Evidence & diagnostics (Packs 019–022)",
    items: [
      { label: "Evidence documents", href: "/finance/evidence", icon: FileCheck2 },
      { label: "Approval requests", href: "/finance/approvals", icon: ClipboardCheck },
      { label: "Trial balance snapshots", href: "/finance/reporting/trial-balance-snapshots", icon: Scale },
      { label: "API & webhook log", href: "/finance/integration/delivery-log", icon: Radio },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Administration", href: "/admin", icon: Settings },
    ],
  },
];

function navItemIsActive(pathname: string, href: string): boolean {
  if (href === "/finance/dashboard") return pathname === href;
  if (
    href === "/finance/payroll" ||
    href === "/finance/integration" ||
    href === "/finance/leave" ||
    href === "/finance/banking" ||
    href === "/finance/catalog-billing" ||
    href === "/finance/inventory-assets" ||
    href === "/finance/reporting-hub" ||
    href === "/finance/planning-hub" ||
    href === "/finance/consolidation-commercial-hub" ||
    href === "/finance/operations-hub" ||
    href === "/finance/tax" ||
    href === "/finance/pack-015" ||
    href === "/finance/pack-013"
  ) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function FinanceSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="flex flex-col w-56 border-r border-white/8 bg-[#0d0d0d]/95 backdrop-blur-md overflow-y-auto
                 flex-shrink-0 supports-[backdrop-filter]:bg-[#0d0d0d]/88"
    >
      {/* Logo */}
      <Link
        href="/finance/dashboard"
        className="flex items-center gap-2.5 px-4 py-4 border-b border-white/8 hover:bg-white/[0.03] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500/40"
      >
        <Image
          src="/branding/watchman-by-esct.png"
          alt="Watchman by ESCT"
          width={40}
          height={40}
          className="h-10 w-10 rounded-md object-contain flex-shrink-0 border border-white/10 bg-black/30"
        />
        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-neutral-100 leading-tight truncate">Watchman</p>
          <p className="text-[9px] text-amber-500 uppercase tracking-widest mt-0.5">Finance</p>
        </div>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-5">
        {NAV.map((group) => (
          <div key={group.title}>
            <p className="px-2 mb-1.5 text-[10px] font-medium uppercase tracking-[0.15em] text-neutral-600">
              {group.title}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = navItemIsActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`
                        flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm
                        transition-all duration-200 ease-out group motion-safe:active:scale-[0.98]
                        ${active
                          ? "bg-amber-500/10 text-amber-400 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.12)]"
                          : "text-neutral-400 hover:text-neutral-200 hover:bg-white/5 hover:translate-x-0.5"
                        }
                      `}
                    >
                      <Icon
                        size={14}
                        className={active ? "text-amber-400" : "text-neutral-500 group-hover:text-neutral-300"}
                      />
                      <span className="flex-1 leading-none">{item.label}</span>
                      {active && <ChevronRight size={10} className="text-amber-500/60" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Tenant badge */}
      <div className="px-4 py-4 border-t border-white/8">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
            <span className="text-amber-400 font-bold text-[9px]">EST</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-neutral-300 truncate">ESCT Holdings</p>
            <p className="text-[10px] text-neutral-600 truncate">ESCT Entity</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
