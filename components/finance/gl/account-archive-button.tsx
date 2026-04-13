"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { archiveAccount } from "@/modules/finance-core/actions/finance-core-actions";

export function AccountArchiveButton({
  tenantId,
  entityId,
  accountId,
  code,
}: {
  tenantId: string;
  entityId: string;
  accountId: string;
  code: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function onArchive() {
    if (!confirm(`Archive account ${code}? It will be marked inactive.`)) return;
    start(async () => {
      const res = await archiveAccount({ tenantId, entityId, accountId });
      if (!res.success) {
        alert(res.message ?? "Could not archive account.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={onArchive}
      disabled={pending}
      className="text-xs text-amber-600 hover:text-amber-400 disabled:opacity-50"
    >
      {pending ? "…" : "Archive"}
    </button>
  );
}
