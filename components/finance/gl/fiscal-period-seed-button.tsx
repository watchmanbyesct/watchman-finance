"use client";

import { useState, useTransition } from "react";
import { seedFiscalPeriods } from "@/modules/finance-core/actions/finance-core-actions";

export function FiscalPeriodSeedButton({
  tenantId,
  entityId,
}: {
  tenantId: string;
  entityId: string;
}) {
  const [pending, start] = useTransition();
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="wf-card border-amber-500/20 bg-amber-950/10 space-y-2.5">
      <p className="text-sm font-medium text-neutral-100">Seed fiscal periods</p>
      <p className="text-xs text-neutral-500 leading-relaxed">
        Creates monthly periods (Jan-Dec) for a fiscal year. Re-running is safe and upserts by date range.
      </p>
      {msg ? <p className="text-xs text-amber-400">{msg}</p> : null}
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-neutral-500">
          Year
          <input
            type="number"
            min={2000}
            max={2100}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="ml-2 w-28 rounded border border-white/10 bg-white/5 px-2 py-1 text-neutral-200"
          />
        </label>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            start(async () => {
              const res = await seedFiscalPeriods({ tenantId, entityId, fiscalYear: year });
              setMsg(res.message);
            });
          }}
          className="rounded-md border border-amber-500/30 bg-amber-500/90 px-4 py-2 text-sm font-medium text-black hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {pending ? "Seeding…" : "Seed year"}
        </button>
      </div>
    </div>
  );
}
