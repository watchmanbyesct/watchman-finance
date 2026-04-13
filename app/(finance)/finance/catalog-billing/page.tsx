import Link from "next/link";
import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";

export const metadata = { title: "Pack 007 — Catalog & billing — Watchman Finance" };

const LINKS = [
  { href: "/finance/pack-013", label: "Pack 013 — Permissions map (catalog & billing)" },
  { href: "/finance/catalog/items", label: "Catalog — categories & items" },
  { href: "/finance/catalog/pricing", label: "Catalog — item prices" },
  { href: "/finance/billing/rules", label: "Billing — rules" },
  { href: "/finance/billing/candidates", label: "Billing — billable event candidates" },
  { href: "/finance/billing/exceptions", label: "Billing — exception events (list + resolve)" },
];

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();

  return (
    <WorkflowPageFrame
      title="Pack 007 — Catalog & contract billing"
      moduleLine="Migration pack 007: sellable catalog, prices, billing rules, billable candidates, and exception visibility."
      packNumber={7}
      workspaceName="Catalog & billing"
      workspace={workspace}
    >
      {workspace && (
        <div className="wf-card space-y-4">
          <p className="text-sm text-neutral-400 leading-relaxed">
            Each workflow uses read queries and server actions where implemented. Exception events are listed for
            operators; resolution actions can be added when your billing engine defines them.
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
