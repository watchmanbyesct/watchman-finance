"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, BookOpen, Users, Building2, FileText,
  Receipt, CreditCard, Wallet, Briefcase, CalendarClock,
  Landmark, Package, Tag, Zap, BarChart3, TrendingUp,
  ShieldCheck, Settings, ChevronRight, Layers, Activity,
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
    ],
  },
  {
    title: "Accounting",
    items: [
      { label: "Chart of Accounts", href: "/finance/accounts",       icon: BookOpen },
      { label: "Journal Entries",   href: "/finance/journals",       icon: FileText },
      { label: "Fiscal Periods",    href: "/finance/periods",        icon: CalendarClock },
    ],
  },
  {
    title: "Revenue",
    items: [
      { label: "Customers",    href: "/finance/ar/customers",  icon: Users },
      { label: "Invoices",     href: "/finance/ar/invoices",   icon: Receipt },
      { label: "Payments In",  href: "/finance/ar/payments",   icon: Wallet },
    ],
  },
  {
    title: "Payables",
    items: [
      { label: "Vendors",      href: "/finance/ap/vendors",    icon: Building2 },
      { label: "Bills",        href: "/finance/ap/bills",      icon: FileText },
      { label: "Payments Out", href: "/finance/ap/payments",   icon: CreditCard },
    ],
  },
  {
    title: "Payroll",
    items: [
      { label: "Pay Profiles", href: "/finance/payroll/profiles",    icon: Briefcase },
      { label: "Payroll Runs", href: "/finance/payroll/runs",        icon: Zap },
      { label: "Pay Statements", href: "/finance/payroll/statements", icon: FileText },
      { label: "Leave",        href: "/finance/leave/balances",      icon: CalendarClock },
    ],
  },
  {
    title: "Banking",
    items: [
      { label: "Bank Accounts",    href: "/finance/banking/accounts",         icon: Landmark },
      { label: "Reconciliation",   href: "/finance/banking/reconciliations",  icon: ShieldCheck },
    ],
  },
  {
    title: "Commercial",
    items: [
      { label: "Catalog",     href: "/finance/catalog/items",        icon: Tag },
      { label: "Billing",     href: "/finance/billing/candidates",   icon: Zap },
      { label: "Inventory",   href: "/finance/inventory/items",      icon: Package },
    ],
  },
  {
    title: "Intelligence",
    items: [
      { label: "Reports",    href: "/finance/reporting/reports",     icon: BarChart3 },
      { label: "Dashboards", href: "/finance/reporting/dashboards",  icon: LayoutDashboard },
      { label: "Budgets",    href: "/finance/planning/budgets",      icon: TrendingUp },
      { label: "Forecasts",  href: "/finance/planning/forecasts",    icon: TrendingUp },
    ],
  },
  {
    title: "Structure",
    items: [
      { label: "Consolidation", href: "/finance/consolidation/groups", icon: Layers },
      { label: "Releases",      href: "/finance/operations/releases", icon: Activity },
      { label: "System health", href: "/finance/operations/health",   icon: ShieldCheck },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Administration", href: "/admin", icon: Settings },
    ],
  },
];

export function FinanceSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="flex flex-col w-56 border-r border-white/8 bg-[#0d0d0d] overflow-y-auto
                 flex-shrink-0"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/8">
        <div
          className="w-7 h-7 rounded-md bg-amber-500 flex items-center justify-center
                     flex-shrink-0"
        >
          <span className="text-black font-bold text-xs">W</span>
        </div>
        <div>
          <p className="text-xs font-semibold text-neutral-100 leading-none">Watchman</p>
          <p className="text-[10px] text-amber-500 uppercase tracking-widest mt-0.5">Finance</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-5">
        {NAV.map((group) => (
          <div key={group.title}>
            <p className="px-2 mb-1.5 text-[10px] font-medium uppercase tracking-[0.15em] text-neutral-600">
              {group.title}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  item.href === "/finance/dashboard"
                    ? pathname === item.href
                    : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`
                        flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm
                        transition-colors group
                        ${active
                          ? "bg-amber-500/10 text-amber-400"
                          : "text-neutral-400 hover:text-neutral-200 hover:bg-white/5"
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
            <p className="text-xs font-medium text-neutral-300 truncate">EST Holdings</p>
            <p className="text-[10px] text-neutral-600 truncate">ESCT Entity</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
