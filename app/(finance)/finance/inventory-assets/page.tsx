/**
 * Copyright 2026 ESCT Holdings Inc.
 * Developed by Owens F. Shepard for ESCT Holdings Inc.
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
      moduleLine="Migration pack 008: catalog-style inventory master, stock balances, issues to people, and equipment assets."
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
