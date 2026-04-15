/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

"use client";

import { useState, useTransition } from "react";
import { seedChartOfAccounts } from "@/modules/finance-core/actions/finance-core-actions";

export function AccountSeedButton({
  tenantId,
  entityId,
}: {
  tenantId: string;
  entityId: string;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="wf-card border-amber-500/20 bg-amber-950/10 space-y-2.5">
      <p className="text-sm font-medium text-neutral-100">Seed Chart of Accounts</p>
      <p className="text-xs text-neutral-500 leading-relaxed">
        Inserts a default COA template for this entity (upsert by account code, so re-running is safe).
      </p>
      {msg ? <p className="text-xs text-amber-400">{msg}</p> : null}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          start(async () => {
            const res = await seedChartOfAccounts({ tenantId, entityId });
            setMsg(res.message);
          });
        }}
        className="rounded-md border border-amber-500/30 bg-amber-500/90 px-4 py-2 text-sm font-medium text-black hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pending ? "Seeding…" : "Seed default accounts"}
      </button>
    </div>
  );
}
