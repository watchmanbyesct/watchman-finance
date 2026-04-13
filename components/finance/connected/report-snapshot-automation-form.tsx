"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { FinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { executeReportSnapshotAutomation } from "@/modules/reporting/actions/reporting-actions";

const input =
  "rounded-md border border-white/10 bg-white/5 px-3 py-2 text-neutral-200 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/40";

type Def = { id: string; report_code: string; report_name: string };

export function ReportSnapshotAutomationForm({
  workspace,
  definitions,
  defaultAsOf,
}: {
  workspace: FinanceWorkspace;
  definitions: Def[];
  defaultAsOf: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const runnable = definitions.filter((d) => d.report_code === "ar_aging");

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Run snapshot automation</h2>
      <p className="text-xs text-neutral-500 leading-relaxed">
        Pack 017 executes deep snapshot builders (today: <code className="text-neutral-400">ar_aging</code>) into{" "}
        <code className="text-neutral-400">report_snapshots</code> and logs each run in{" "}
        <code className="text-neutral-400">report_execution_log</code>. Requires permission{" "}
        <code className="text-neutral-400">reporting.automation.execute</code>.
      </p>
      {!runnable.length ? (
        <p className="text-xs text-neutral-500">No supported report definitions for this tenant (add ar_aging).</p>
      ) : (
        <>
          {msg && <p className="text-xs text-amber-400">{msg}</p>}
          <form
            className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              start(async () => {
                setMsg(null);
                const res = await executeReportSnapshotAutomation({
                  tenantId: workspace.tenantId,
                  entityId: workspace.entityId,
                  reportDefinitionId: String(fd.get("reportDefinitionId") ?? ""),
                  asOfDate: String(fd.get("asOfDate") ?? "").trim(),
                });
                setMsg(res.message);
                if (res.success) router.refresh();
              });
            }}
          >
            <label className="flex flex-col gap-1 md:col-span-2">
              <span className="text-neutral-500 text-xs">Report</span>
              <select name="reportDefinitionId" required className={input}>
                {runnable.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.report_code} — {d.report_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-neutral-500 text-xs">As-of date</span>
              <input name="asOfDate" type="date" required defaultValue={defaultAsOf} className={input} />
            </label>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black"
              >
                {pending ? "Running…" : "Generate snapshot"}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
