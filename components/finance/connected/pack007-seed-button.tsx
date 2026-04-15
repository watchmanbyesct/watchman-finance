/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { seedPack007CatalogBilling } from "@/modules/catalog/actions/catalog-actions";

export function Pack007SeedButton({
  tenantId,
  entityId,
  enabled,
}: {
  tenantId: string;
  entityId: string;
  enabled: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="wf-card border-amber-500/20 bg-amber-950/10 space-y-2.5">
      <p className="text-sm font-medium text-neutral-100">Seed Pack 007</p>
      <p className="text-xs text-neutral-500 leading-relaxed">
        Seeds starter catalog + billing data (categories, items, prices, rules, and candidates). Safe to run multiple times.
      </p>
      {msg ? <p className="text-xs text-amber-400">{msg}</p> : null}
      <button
        type="button"
        disabled={pending || !enabled}
        onClick={() => {
          start(async () => {
            const res = await seedPack007CatalogBilling({ tenantId, entityId });
            setMsg(res.message);
            if (res.success) router.refresh();
          });
        }}
        className="rounded-md border border-amber-500/30 bg-amber-500/90 px-4 py-2 text-sm font-medium text-black hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pending ? "Seeding…" : "Seed Pack 007 data"}
      </button>
      {!enabled ? (
        <p className="text-xs text-neutral-600">
          Requires mutate access for catalog + billing permissions.
        </p>
      ) : null}
    </div>
  );
}
