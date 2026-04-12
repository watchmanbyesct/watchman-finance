import { requireAuthSession } from "@/lib/auth/resolve-session";
import { FinanceSidebar } from "@/components/layout/finance-sidebar";
import { FinanceTopbar } from "@/components/layout/finance-topbar";

export default async function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuthSession();

  return (
    <div className="flex h-screen overflow-hidden bg-[#0d0d0d]">
      <FinanceSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <FinanceTopbar />
        <main className="flex-1 overflow-y-auto px-6 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
