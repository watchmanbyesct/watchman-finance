/**
 * Copyright 2026 ESCT Holdings Inc.
 * Developed by Owens F. Shepard for ESCT Holdings Inc.
 */

import Link from "next/link";
import { AdminSubpage } from "@/components/admin/admin-subpage";

export const metadata = { title: "System health — Administration" };

export default function Page() {
  return (
    <AdminSubpage
      title="System health"
      description="Queue depth, job runs, and audit volume are surfaced under Operations & QA (Pack 012)."
    >
      <div className="wf-card space-y-4 text-sm text-neutral-400 leading-relaxed">
        <ul className="space-y-2">
          <li>
            <Link href="/finance/operations/health" className="text-amber-500 hover:text-amber-400">
              System health checks
            </Link>
          </li>
          <li>
            <Link href="/finance/operations/jobs" className="text-amber-500 hover:text-amber-400">
              Job run history
            </Link>
          </li>
          <li>
            <Link href="/finance/operations/alerts" className="text-amber-500 hover:text-amber-400">
              Operational alerts
            </Link>
          </li>
        </ul>
      </div>
    </AdminSubpage>
  );
}
