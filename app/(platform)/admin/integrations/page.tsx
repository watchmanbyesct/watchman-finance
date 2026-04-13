import Link from "next/link";
import { AdminSubpage } from "@/components/admin/admin-subpage";

export const metadata = { title: "Integration health — Administration" };

export default function Page() {
  return (
    <AdminSubpage
      title="Integration health"
      description="Operational views for Launch and Operations staging, pipelines, and delivery diagnostics."
    >
      <div className="wf-card space-y-4 text-sm text-neutral-400 leading-relaxed">
        <p>Use these finance routes for live integration data and workflows:</p>
        <ul className="space-y-2">
          <li>
            <Link href="/finance/integration" className="text-amber-500 hover:text-amber-400">
              Pack 002 — Integration hub
            </Link>
          </li>
          <li>
            <Link href="/finance/integration/pipeline" className="text-amber-500 hover:text-amber-400">
              Event pipeline
            </Link>
          </li>
          <li>
            <Link href="/finance/integration/staging/employees" className="text-amber-500 hover:text-amber-400">
              Staging — Employees
            </Link>
          </li>
          <li>
            <Link href="/finance/integration/delivery-log" className="text-amber-500 hover:text-amber-400">
              API idempotency & webhook delivery log (Pack 022)
            </Link>
          </li>
          <li>
            <Link href="/finance/integration/quickbooks" className="text-amber-500 hover:text-amber-400">
              QuickBooks Online — OAuth (Pack 002 / 024)
            </Link>
          </li>
        </ul>
      </div>
    </AdminSubpage>
  );
}
