/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

"use client";

import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Account } from "@/types";
import type { FinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { AccountArchiveButton } from "@/components/finance/gl/account-archive-button";
import { updateAccount } from "@/modules/finance-core/actions/finance-core-actions";
import {
  INTEGRATION_ACCOUNT_TYPE_VALUES,
  SOURCE_OF_TRUTH_VALUES,
} from "@/lib/finance/account-integration-taxonomy";

function fmt(s: string): string {
  return s.replaceAll("_", " ");
}

const input =
  "rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-neutral-200 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/40 w-full min-w-0";

export function AccountsTable({
  accounts,
  workspace,
}: {
  accounts: Account[];
  workspace: FinanceWorkspace;
}) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);

  if (!accounts.length) {
    return (
      <p className="text-sm text-neutral-500 py-8 text-center border border-dashed border-white/10 rounded-lg">
        No accounts yet. Add your first account using the form above.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <table className="w-full text-sm text-left">
        <thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-neutral-500">
          <tr>
            <th className="px-4 py-3 font-medium w-8" aria-hidden />
            <th className="px-4 py-3 font-medium">Code</th>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Integration / Source</th>
            <th className="px-4 py-3 font-medium">Balance</th>
            <th className="px-4 py-3 font-medium">Posting</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium w-36" />
          </tr>
        </thead>
        <tbody className="divide-y divide-white/8">
          {accounts.map((a) => (
            <Fragment key={a.id}>
              <tr className="text-neutral-300 hover:bg-white/[0.02]">
                <td className="px-2 py-2.5 align-top">
                  <button
                    type="button"
                    aria-expanded={openId === a.id}
                    aria-label={openId === a.id ? "Collapse source editor" : "Expand source editor"}
                    onClick={() => setOpenId((id) => (id === a.id ? null : a.id))}
                    className="text-xs text-amber-600/90 hover:text-amber-400 px-1"
                  >
                    {openId === a.id ? "▼" : "▶"}
                  </button>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-amber-500/90">{a.code}</td>
                <td className="px-4 py-2.5">{a.name}</td>
                <td className="px-4 py-2.5 text-neutral-500">{a.accountType}</td>
                <td className="px-4 py-2.5 text-xs text-neutral-500">
                  {(a.integrationAccountType ? fmt(a.integrationAccountType) : "—")} / {fmt(a.sourceOfTruth)}
                </td>
                <td className="px-4 py-2.5 text-neutral-500 capitalize">{a.normalBalance}</td>
                <td className="px-4 py-2.5">{a.allowPosting ? "Yes" : "No"}</td>
                <td className="px-4 py-2.5">
                  {a.isActive ? (
                    <span className="text-emerald-500/90 text-xs">Active</span>
                  ) : (
                    <span className="text-neutral-600 text-xs">Inactive</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  {a.isActive ? (
                    <AccountArchiveButton
                      tenantId={workspace.tenantId}
                      entityId={workspace.entityId}
                      accountId={a.id}
                      code={a.code}
                    />
                  ) : (
                    <span className="text-xs text-neutral-600">—</span>
                  )}
                </td>
              </tr>
              {openId === a.id && (
                <tr className="bg-white/[0.02]">
                  <td colSpan={9} className="px-4 py-4 border-t border-white/8">
                    <AccountIntegrationMetadataEditor
                      account={a}
                      workspace={workspace}
                      onSaved={() => {
                        setOpenId(null);
                        router.refresh();
                      }}
                    />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AccountIntegrationMetadataEditor({
  account,
  workspace,
  onSaved,
}: {
  account: Account;
  workspace: FinanceWorkspace;
  onSaved: () => void;
}) {
  const [sourceOfTruth, setSourceOfTruth] = useState(account.sourceOfTruth);
  const [integrationType, setIntegrationType] = useState(account.integrationAccountType ?? "");
  const [detailType, setDetailType] = useState(account.integrationDetailType ?? "");
  const [refTable, setRefTable] = useState(account.sourceReferenceTable ?? "");
  const [extRef, setExtRef] = useState(account.externalAccountRef ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-3 max-w-3xl">
      <div>
        <h3 className="text-xs font-medium text-neutral-300">
          Pack 025 — Integration taxonomy & source of truth
        </h3>
        <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
          Source of truth marks which subsystem should originate activity for this account. Subledger GL bindings and
          automated posting validate against it (see GL posting bindings).
        </p>
      </div>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            setMsg(null);
            const res = await updateAccount({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              accountId: account.id,
              sourceOfTruth,
              integrationAccountType: integrationType === "" ? null : integrationType,
              integrationDetailType: detailType.trim() === "" ? null : detailType.trim(),
              sourceReferenceTable: refTable.trim() === "" ? null : refTable.trim(),
              externalAccountRef: extRef.trim() === "" ? null : extRef.trim(),
            });
            if (res.success) {
              onSaved();
              return;
            }
            setMsg(res.message);
          });
        }}
      >
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Source of truth</span>
          <select
            name="sourceOfTruth"
            value={sourceOfTruth}
            onChange={(e) => setSourceOfTruth(e.target.value as Account["sourceOfTruth"])}
            className={input}
          >
            {SOURCE_OF_TRUTH_VALUES.map((v) => (
              <option key={v} value={v}>
                {fmt(v)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Integration account type</span>
          <select
            name="integrationAccountType"
            value={integrationType}
            onChange={(e) => setIntegrationType(e.target.value)}
            className={input}
          >
            <option value="">Not set</option>
            {INTEGRATION_ACCOUNT_TYPE_VALUES.map((v) => (
              <option key={v} value={v}>
                {fmt(v)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-neutral-500 text-xs">Integration detail type (free text)</span>
          <input
            name="integrationDetailType"
            value={detailType}
            onChange={(e) => setDetailType(e.target.value)}
            maxLength={200}
            placeholder="e.g. checking, undeposited_funds"
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Source reference table (optional)</span>
          <input
            name="sourceReferenceTable"
            value={refTable}
            onChange={(e) => setRefTable(e.target.value)}
            maxLength={200}
            placeholder="e.g. bank_accounts"
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">External account ref (optional)</span>
          <input
            name="externalAccountRef"
            value={extRef}
            onChange={(e) => setExtRef(e.target.value)}
            maxLength={200}
            placeholder="e.g. external system account id"
            className={input}
          />
        </label>
        <div className="sm:col-span-2 flex gap-2 items-center">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-amber-600/90 px-3 py-1.5 text-xs font-medium text-black disabled:opacity-40"
          >
            {pending ? "Saving…" : "Save source metadata"}
          </button>
          <button
            type="button"
            onClick={() => {
              setSourceOfTruth(account.sourceOfTruth);
              setIntegrationType(account.integrationAccountType ?? "");
              setDetailType(account.integrationDetailType ?? "");
              setRefTable(account.sourceReferenceTable ?? "");
              setExtRef(account.externalAccountRef ?? "");
              setMsg(null);
            }}
            className="text-xs text-neutral-500 hover:text-neutral-300"
          >
            Reset to loaded values
          </button>
        </div>
      </form>
    </div>
  );
}
