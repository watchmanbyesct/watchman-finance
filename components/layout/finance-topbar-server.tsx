/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import { requireAuthSession, getAuthSession } from "@/lib/auth/resolve-session";
import { getOptionalFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { FinanceTopbarClient } from "@/components/layout/finance-topbar-client";

/** Server facade: attaches multi-tenant shell context to Watchman Finance top chrome. */
export async function FinanceTopbarServer() {
  await requireAuthSession();
  const session = await getAuthSession();
  const workspace = await getOptionalFinanceWorkspace();

  return (
    <FinanceTopbarClient workspace={workspace} sessionEmail={session?.email ?? ""} />
  );
}
