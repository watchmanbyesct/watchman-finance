/**
 * Copyright 2026 ESCT Holdings Inc.
 * Developed by Owens F. Shepard for ESCT Holdings Inc.
 */

import Link from "next/link";
import { AdminSubpage } from "@/components/admin/admin-subpage";

export const metadata = { title: "Module entitlements — Administration" };

export default function Page() {
  return (
    <AdminSubpage
      title="Module entitlements"
      description="Enable or disable finance modules per tenant. Entitlements are stored in tenant_module_entitlements (Pack 013)."
    >
      <div className="wf-card space-y-3 text-sm text-neutral-400 leading-relaxed">
        <p>
          Module toggles and role wiring are seeded at bootstrap and extended via SQL. Use the permissions map to see
          which capabilities each surface expects.
        </p>
        <ul className="list-disc list-inside space-y-1 text-neutral-500">
          <li>
            <Link href="/finance/pack-013" className="text-amber-500 hover:text-amber-400">
              Pack 013 — module permissions map
            </Link>
          </li>
          <li>
            <Link href="/finance/pack-015" className="text-amber-500 hover:text-amber-400">
              Pack 015 — extension permissions
            </Link>
          </li>
        </ul>
      </div>
    </AdminSubpage>
  );
}
