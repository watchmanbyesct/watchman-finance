/** Curated quick-jump targets for the command palette (⌘K). */
export type FinancePaletteLink = {
  href: string;
  label: string;
  group: string;
  /** Extra tokens to match in search (space-separated ok). */
  keywords?: string;
};

export const FINANCE_PALETTE_LINKS: FinancePaletteLink[] = [
  { href: "/finance/dashboard", label: "Dashboard", group: "Overview", keywords: "home" },
  { href: "/finance/pack-013", label: "Pack 013 permissions", group: "Overview" },
  { href: "/finance/pack-015", label: "Pack 015 extensions", group: "Overview" },

  { href: "/finance/integration", label: "Integration hub", group: "Integration", keywords: "pack 002" },
  {
    href: "/finance/integration/accounting-oauth",
    label: "External accounting (OAuth)",
    group: "Integration",
    keywords: "oauth accounting integration",
  },
  { href: "/finance/integration/pipeline", label: "Event pipeline", group: "Integration" },
  { href: "/finance/integration/delivery-log", label: "API & webhook log", group: "Integration" },

  { href: "/finance/accounts", label: "Chart of accounts", group: "Accounting" },
  { href: "/finance/journals", label: "Journal entries", group: "Accounting" },
  { href: "/finance/gl/posting-bindings", label: "GL posting bindings", group: "Accounting" },
  { href: "/finance/periods", label: "Fiscal periods", group: "Accounting" },

  { href: "/finance/ar-ap", label: "AR & AP overview", group: "AR & AP", keywords: "pack 003" },
  { href: "/finance/ar/invoices", label: "Invoices", group: "AR & AP" },
  { href: "/finance/ap/bills", label: "Bills", group: "AR & AP" },
  { href: "/finance/ar/payments", label: "Payments in", group: "AR & AP" },
  { href: "/finance/ap/payments", label: "Payments out", group: "AR & AP" },

  { href: "/finance/tax", label: "Tax & payroll pay", group: "Tax", keywords: "pack 014" },
  { href: "/finance/payroll", label: "Payroll overview", group: "Payroll", keywords: "pack 004" },
  { href: "/finance/leave", label: "Leave overview", group: "Leave", keywords: "pack 005" },
  { href: "/finance/banking", label: "Banking overview", group: "Banking", keywords: "pack 006" },

  { href: "/finance/catalog-billing", label: "Catalog & billing", group: "Catalog", keywords: "pack 007" },
  { href: "/finance/inventory-assets", label: "Inventory & assets", group: "Inventory", keywords: "pack 008" },

  { href: "/finance/reporting-hub", label: "Reporting hub", group: "Reporting", keywords: "pack 009" },
  { href: "/finance/planning-hub", label: "Planning hub", group: "Planning", keywords: "pack 010" },
  {
    href: "/finance/consolidation-commercial-hub",
    label: "Consolidation & commercial",
    group: "Commercial",
    keywords: "pack 011",
  },
  { href: "/finance/operations-hub", label: "Operations & QA", group: "Operations", keywords: "pack 012" },

  { href: "/finance/evidence", label: "Evidence documents", group: "Evidence & diagnostics", keywords: "019" },
  { href: "/finance/approvals", label: "Approval requests", group: "Evidence & diagnostics", keywords: "020" },
  {
    href: "/finance/reporting/trial-balance-snapshots",
    label: "Trial balance snapshots",
    group: "Evidence & diagnostics",
    keywords: "021",
  },

  { href: "/admin", label: "Administration", group: "System", keywords: "admin settings" },
];
