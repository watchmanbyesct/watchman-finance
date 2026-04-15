/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import { requireAuthSession } from "@/lib/auth/resolve-session";
import { FinanceSidebar } from "@/components/layout/finance-sidebar";
import { FinanceTopbar } from "@/components/layout/finance-topbar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuthSession();
  return (
    <div className="flex h-screen overflow-hidden wf-app-shell">
      <FinanceSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <FinanceTopbar />
        <main className="flex-1 min-h-0 overflow-y-auto bg-[var(--onyx-900)] px-6 py-6 text-neutral-100">
          {children}
        </main>
      </div>
    </div>
  );
}
