/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { seedAllPlatformWorkflows } from "@/modules/platform/actions/platform-seed-actions";

export function PlatformSeedAllButton({
  tenantId,
  entityId,
}: {
  tenantId: string;
  entityId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [summary, setSummary] = useState<string | null>(null);
  const [steps, setSteps] = useState<Array<{ key: string; success: boolean; message: string }>>([]);

  return (
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-4 space-y-3">
      <p className="text-sm font-semibold text-neutral-100">One-click platform seed</p>
      <p className="text-xs text-neutral-500 leading-relaxed">
        Runs all currently wired seed workflows in order and reports each step. Safe to run repeatedly.
      </p>
      {summary ? <p className="text-xs text-emerald-300">{summary}</p> : null}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          start(async () => {
            const res = await seedAllPlatformWorkflows({ tenantId, entityId });
            setSummary(res.message);
            setSteps(res.data?.steps ?? []);
            router.refresh();
          });
        }}
        className="rounded-md border border-emerald-500/30 bg-emerald-500/90 px-3.5 py-2 text-sm font-medium text-black hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pending ? "Running full seed…" : "Seed Entire Platform"}
      </button>
      {steps.length ? (
        <div className="space-y-1.5">
          {steps.map((s) => (
            <p key={s.key} className="text-[11px] leading-snug text-neutral-400">
              <span className={s.success ? "text-emerald-400" : "text-rose-400"}>{s.success ? "OK" : "FAIL"}</span>{" "}
              {s.key}: {s.message}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
