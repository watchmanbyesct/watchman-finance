import Link from "next/link";
import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";

export const metadata = { title: "Pack 004 — Payroll — Watchman Finance" };

const LINKS = [
  { href: "/finance/payroll/groups", label: "Pay groups" },
  { href: "/finance/payroll/periods", label: "Pay periods" },
  { href: "/finance/payroll/profiles", label: "Employee pay profiles" },
  { href: "/finance/payroll/runs", label: "Payroll runs (create, load time, calculate, approve, finalize)" },
  { href: "/finance/payroll/desktop", label: "Payroll desktop components (items, assignments, liabilities)" },
  { href: "/finance/payroll/statements", label: "Pay statements (from finalized runs)" },
];

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();

  return (
    <WorkflowPageFrame
      title="Pack 004 — Payroll core"
      moduleLine="Migration pack 004: pay groups, periods, profiles, runs, inputs, run items, and pay statements (GL and full tax deferred)."
      packNumber={4}
      workspaceName="Payroll"
      workspace={workspace}
    >
      {workspace && (
        <div className="wf-card space-y-4">
          <p className="text-sm text-neutral-400 leading-relaxed">
            Configure groups and periods, attach pay profiles to finance people, then create a run and use the
            pipeline on the runs page: load approved staged time, calculate, approve, and finalize to generate
            statements.
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
