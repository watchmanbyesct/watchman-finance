import Link from "next/link";
import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";

export const metadata = { title: "Pack 010 — Planning — Watchman Finance" };

const LINKS = [
  { href: "/finance/pack-013", label: "Pack 013 — Permissions map (planning)" },
  { href: "/finance/planning/budgets", label: "Budget versions & lines" },
  { href: "/finance/planning/forecasts", label: "Forecast versions & lines" },
  { href: "/finance/planning/variance", label: "Variance snapshots" },
];

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();

  return (
    <WorkflowPageFrame
      title="Pack 010 — Budgeting & forecasting"
      moduleLine="Migration pack 010: budget versions, forecast versions, lines, and variance snapshot shells."
      packNumber={10}
      workspaceName="Planning"
      workspace={workspace}
    >
      {workspace && (
        <div className="wf-card space-y-4">
          <p className="text-sm text-neutral-400 leading-relaxed">
            Use <code className="text-xs text-neutral-300">planning.budget.manage</code> and{" "}
            <code className="text-xs text-neutral-300">planning.forecast.manage</code> to create versions, lines, and
            variance snapshot rows for this entity.
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
