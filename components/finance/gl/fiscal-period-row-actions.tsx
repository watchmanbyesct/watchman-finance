"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FiscalPeriod } from "@/types";
import type { FinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { closeFiscalPeriod, reopenFiscalPeriod } from "@/modules/finance-core/actions/finance-core-actions";

export function FiscalPeriodRowActions({
  workspace,
  period,
}: {
  workspace: FinanceWorkspace;
  period: FiscalPeriod;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [showReopen, setShowReopen] = useState(false);
  const [reason, setReason] = useState("");

  function onClose() {
    const notes = window.prompt("Optional notes for this close (or leave blank):") ?? "";
    start(async () => {
      const res = await closeFiscalPeriod({
        tenantId: workspace.tenantId,
        entityId: workspace.entityId,
        fiscalPeriodId: period.id,
        notes: notes.trim() || undefined,
      });
      if (!res.success) {
        alert(res.message ?? "Could not close period.");
        return;
      }
      router.refresh();
    });
  }

  function onReopen() {
    if (!reason.trim()) {
      alert("Enter a reopen reason.");
      return;
    }
    start(async () => {
      const res = await reopenFiscalPeriod({
        tenantId: workspace.tenantId,
        entityId: workspace.entityId,
        fiscalPeriodId: period.id,
        reopenReason: reason.trim(),
      });
      if (!res.success) {
        alert(res.message ?? "Could not reopen period.");
        return;
      }
      setShowReopen(false);
      setReason("");
      router.refresh();
    });
  }

  if (period.status === "open") {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={onClose}
        className="text-xs text-amber-600 hover:text-amber-400 disabled:opacity-50"
      >
        {pending ? "…" : "Close period"}
      </button>
    );
  }

  if (period.status === "closed") {
    return (
      <div className="flex flex-col gap-2">
        {!showReopen ? (
          <button
            type="button"
            onClick={() => setShowReopen(true)}
            className="text-xs text-neutral-400 hover:text-neutral-200 text-left"
          >
            Reopen…
          </button>
        ) : (
          <div className="flex flex-col gap-1">
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason (required)"
              className="rounded border border-white/10 bg-black/30 px-2 py-1 text-xs text-neutral-200"
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={onReopen}
                className="text-xs text-amber-600 hover:text-amber-400"
              >
                Submit
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowReopen(false);
                  setReason("");
                }}
                className="text-xs text-neutral-600"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return <span className="text-xs text-neutral-600">Locked</span>;
}
