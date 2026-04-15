/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import Link from "next/link";
import { ArrowRight, Users, Building2, Puzzle, Activity, GitBranch, Shield } from "lucide-react";

export const metadata = { title: "Administration — Watchman Finance" };

const ADMIN_SECTIONS = [
  {
    label: "Tenant Settings",
    description: "Manage tenant identity, timezone, and status.",
    href: "/admin/tenants",
    icon: Building2,
  },
  {
    label: "Module Entitlements",
    description: "Enable or disable finance modules per tenant.",
    href: "/admin/modules",
    icon: Puzzle,
  },
  {
    label: "User Access",
    description: "Manage users, roles, entity scopes, and permissions.",
    href: "/admin/users",
    icon: Users,
  },
  {
    label: "Integration Health",
    description: "Monitor Launch and Operations sync jobs and exceptions.",
    href: "/admin/integrations",
    icon: GitBranch,
  },
  {
    label: "System Health",
    description: "Check queue depth, job status, and audit log volume.",
    href: "/admin/health",
    icon: Activity,
  },
  {
    label: "Release Management",
    description: "Track migration packs, release versions, and readiness.",
    href: "/admin/release",
    icon: Shield,
  },
];

export default function AdminPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="wf-page-title">Administration</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Platform-level controls for Watchman Finance. Restricted to tenant_owner and finance_admin roles.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {ADMIN_SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              href={section.href}
              className="wf-card group hover:border-white/20 transition-colors flex items-start gap-4"
            >
              <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 group-hover:border-amber-500/30 group-hover:bg-amber-500/5 transition-colors">
                <Icon size={16} className="text-neutral-400 group-hover:text-amber-400 transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-200 group-hover:text-neutral-100">
                  {section.label}
                </p>
                <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
                  {section.description}
                </p>
              </div>
              <ArrowRight size={14} className="text-neutral-700 group-hover:text-neutral-400 transition-colors flex-shrink-0 mt-1" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
