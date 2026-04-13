import Link from "next/link";
import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";

export const metadata = { title: "Pack 003 — AR & AP — Watchman Finance" };

const LINKS = [
  { href: "/finance/pack-015", label: "Pack 015 — Tax, AR collections, AP recurring (connected workflows)" },
  { href: "/finance/ar/customers", label: "Accounts receivable — Customers" },
  { href: "/finance/ar/customer-sites", label: "Accounts receivable — Customer sites" },
  { href: "/finance/ar/invoices", label: "Accounts receivable — Invoices" },
  { href: "/finance/ar/credit-memos", label: "Accounts receivable — Credit memos" },
  { href: "/finance/ar/statements", label: "Accounts receivable — Statement runs (Pack 014)" },
  { href: "/finance/ar/collections", label: "Accounts receivable — Collection tasks (Pack 014)" },
  { href: "/finance/ar/payments", label: "Accounts receivable — Customer payments" },
  { href: "/finance/ap/vendors", label: "Accounts payable — Vendors" },
  { href: "/finance/ap/bills", label: "Accounts payable — Bills" },
  { href: "/finance/ap/recurring", label: "Accounts payable — Recurring vendor charges (Pack 014)" },
  { href: "/finance/ap/payments", label: "Accounts payable — Vendor payments" },
];

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();

  return (
    <WorkflowPageFrame
      title="Pack 003 — Accounts receivable & payable"
      moduleLine="Migration pack 003: customers, vendors, invoices, bills, and payment recording (GL posting deferred)."
      packNumber={3}
      workspaceName="AR & AP"
      workspace={workspace}
    >
      {workspace && (
        <div className="wf-card space-y-4">
          <p className="text-sm text-neutral-400 leading-relaxed">
            Each workflow below loads tenant data through read queries and submits through server actions with
            finance permissions. Start with customers and vendors, then invoices and bills, then payments.
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
