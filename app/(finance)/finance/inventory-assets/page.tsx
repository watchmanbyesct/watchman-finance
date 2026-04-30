/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import Link from "next/link";
import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";

export const metadata = { title: "Pack 008 — Inventory & assets — Watchman Finance" };

const LINKS = [
  { href: "/finance/pack-013", label: "Pack 013 — Permissions map (inventory)" },
  { href: "/finance/inventory/items", label: "Master data — categories, locations, items" },
  { href: "/finance/inventory/stock", label: "Stock balances & receive stock" },
  { href: "/finance/inventory/issues", label: "Employee item issues" },
  { href: "/finance/inventory/assets", label: "Equipment assets" },
];

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();

  return (
    <WorkflowPageFrame
      title="Pack 008 — Inventory & assets"
      moduleLine="Pack 008 foundation: inventory master data, stock balances, employee issues, and equipment assets."
      packNumber={8}
      workspaceName="Inventory & Assets"
      workspace={workspace}
    >
      {workspace && (
        <div className="wf-card space-y-4">
          <p className="text-sm text-neutral-400 leading-relaxed">
            Set up locations and items first, then receive stock, record issues, and register serialized or tagged
            equipment. Full receipt documents and transfers can extend these flows later.
          </p>
          <p className="text-xs text-neutral-500">
            Start here: complete{" "}
            <Link href="/finance/inventory/items" className="text-amber-500 hover:text-amber-400">
              master data
            </Link>{" "}
            first, then move into stock balances, issues, and assets.
          </p>
          <ul className="space-y-2 text-sm">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-amber-500 hover:text-amber-400">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </WorkflowPageFrame>
  );
}
