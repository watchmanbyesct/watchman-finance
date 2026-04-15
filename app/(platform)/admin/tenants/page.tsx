/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import Link from "next/link";
import { AdminSubpage } from "@/components/admin/admin-subpage";

export const metadata = { title: "Tenant settings — Administration" };

export default function Page() {
  return (
    <AdminSubpage
      title="Tenant settings"
      description="Tenant identity and status are managed in Supabase today. This screen is the home for future tenant admin APIs and forms."
    >
      <div className="wf-card space-y-3 text-sm text-neutral-400 leading-relaxed">
        <p>
          For day-to-day finance work, use the workspace context in the finance app. When tenant-level CRUD ships here,
          it will call audited server actions scoped to <code className="text-xs text-neutral-300">tenant_owner</code> /{" "}
          <code className="text-xs text-neutral-300">finance_admin</code>.
        </p>
        <p>
          <Link href="/finance/dashboard" className="text-amber-500 hover:text-amber-400">
            Open finance dashboard
          </Link>
        </p>
      </div>
    </AdminSubpage>
  );
}
