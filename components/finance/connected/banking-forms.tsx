"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { FinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import {
  approveReconciliation,
  approveTransferRequest,
  closeReconciliation,
  createBankAccount,
  createReconciliation,
  createTransferRequest,
  importBankTransaction,
  matchBankTransaction,
  seedBankAccounts,
} from "@/modules/banking/actions/banking-actions";

const input =
  "rounded-md border border-white/10 bg-white/5 px-3 py-2 text-neutral-200 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/40";

type BankAcct = { id: string; account_name: string; bank_name: string };

export function BankAccountCreateForm({ workspace }: { workspace: FinanceWorkspace }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Add bank account</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createBankAccount({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              accountName: String(fd.get("accountName") ?? "").trim(),
              bankName: String(fd.get("bankName") ?? "").trim(),
              accountType: String(fd.get("accountType") ?? "operating") as
                | "operating"
                | "payroll"
                | "tax"
                | "savings"
                | "other",
              currencyCode: "USD",
              accountNumberLast4: String(fd.get("accountNumberLast4") ?? "").trim() || undefined,
              routingNumberLast4: String(fd.get("routingNumberLast4") ?? "").trim() || undefined,
            });
            setMsg(res.message);
            if (res.success) {
              (e.target as HTMLFormElement).reset();
              router.refresh();
            }
          });
        }}
      >
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Account name</span>
          <input name="accountName" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Bank name</span>
          <input name="bankName" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Account type</span>
          <select name="accountType" className={input}>
            <option value="operating">operating</option>
            <option value="payroll">payroll</option>
            <option value="tax">tax</option>
            <option value="savings">savings</option>
            <option value="other">other</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Acct last 4 (optional)</span>
          <input name="accountNumberLast4" maxLength={4} className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Routing last 4 (optional)</span>
          <input name="routingNumberLast4" maxLength={4} className={input} />
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black hover:bg-amber-500 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Create bank account"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function BankAccountSeedButton({ workspace }: { workspace: FinanceWorkspace }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="wf-card border-amber-500/20 bg-amber-950/10 space-y-2.5">
      <p className="text-sm font-medium text-neutral-100">Seed bank accounts</p>
      <p className="text-xs text-neutral-500 leading-relaxed">
        Adds default Operating, Payroll, and Tax accounts for this entity. Safe to re-run.
      </p>
      {msg ? <p className="text-xs text-amber-400">{msg}</p> : null}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          start(async () => {
            const res = await seedBankAccounts({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
            });
            setMsg(res.message);
            if (res.success) router.refresh();
          });
        }}
        className="rounded-md border border-amber-500/30 bg-amber-500/90 px-4 py-2 text-sm font-medium text-black hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pending ? "Seeding…" : "Seed default bank accounts"}
      </button>
    </div>
  );
}

export function ImportBankTransactionForm({
  workspace,
  bankAccounts,
}: {
  workspace: FinanceWorkspace;
  bankAccounts: BankAcct[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Import bank transaction</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await importBankTransaction({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              bankAccountId: String(fd.get("bankAccountId") ?? ""),
              transactionDate: String(fd.get("transactionDate") ?? ""),
              postedDate: String(fd.get("postedDate") ?? "").trim() || undefined,
              transactionType: String(fd.get("transactionType") ?? "debit") as
                | "debit"
                | "credit"
                | "fee"
                | "transfer"
                | "other",
              amount: Number(fd.get("amount") ?? 0),
              description: String(fd.get("description") ?? "").trim(),
              referenceNumber: String(fd.get("referenceNumber") ?? "").trim() || undefined,
            });
            setMsg(res.message);
            if (res.success) {
              (e.target as HTMLFormElement).reset();
              router.refresh();
            }
          });
        }}
      >
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Bank account</span>
          <select name="bankAccountId" required className={input}>
            <option value="">Select…</option>
            {bankAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.bank_name} — {a.account_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Transaction date</span>
          <input name="transactionDate" type="date" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Posted date (optional)</span>
          <input name="postedDate" type="date" className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Type</span>
          <select name="transactionType" className={input}>
            <option value="debit">debit</option>
            <option value="credit">credit</option>
            <option value="fee">fee</option>
            <option value="transfer">transfer</option>
            <option value="other">other</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Amount (+/-)</span>
          <input name="amount" type="number" step="0.01" required className={input} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Description</span>
          <input name="description" required className={input} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Reference (optional)</span>
          <input name="referenceNumber" className={input} />
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={pending || !bankAccounts.length}
            className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black hover:bg-amber-500 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Import transaction"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function ReconciliationCreateForm({
  workspace,
  bankAccounts,
}: {
  workspace: FinanceWorkspace;
  bankAccounts: BankAcct[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Start reconciliation</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createReconciliation({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              bankAccountId: String(fd.get("bankAccountId") ?? ""),
              reconciliationName: String(fd.get("reconciliationName") ?? "").trim(),
              statementStartDate: String(fd.get("statementStartDate") ?? ""),
              statementEndDate: String(fd.get("statementEndDate") ?? ""),
              statementEndingBalance: Number(fd.get("statementEndingBalance") ?? 0),
            });
            setMsg(res.message);
            if (res.success) {
              (e.target as HTMLFormElement).reset();
              router.refresh();
            }
          });
        }}
      >
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Bank account</span>
          <select name="bankAccountId" required className={input}>
            <option value="">Select…</option>
            {bankAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.bank_name} — {a.account_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Reconciliation name</span>
          <input name="reconciliationName" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Statement start</span>
          <input name="statementStartDate" type="date" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Statement end</span>
          <input name="statementEndDate" type="date" required className={input} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Statement ending balance</span>
          <input name="statementEndingBalance" type="number" step="0.01" required className={input} />
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={pending || !bankAccounts.length}
            className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black hover:bg-amber-500 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Create reconciliation"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function TransferRequestForm({
  workspace,
  bankAccounts,
}: {
  workspace: FinanceWorkspace;
  bankAccounts: BankAcct[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Request transfer</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createTransferRequest({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              fromBankAccountId: String(fd.get("fromBankAccountId") ?? ""),
              toBankAccountId: String(fd.get("toBankAccountId") ?? ""),
              requestedAmount: Number(fd.get("requestedAmount") ?? 0),
              transferDate: String(fd.get("transferDate") ?? "").trim() || undefined,
              requestReason: String(fd.get("requestReason") ?? "").trim() || undefined,
            });
            setMsg(res.message);
            if (res.success) {
              (e.target as HTMLFormElement).reset();
              router.refresh();
            }
          });
        }}
      >
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">From account</span>
          <select name="fromBankAccountId" required className={input}>
            <option value="">Select…</option>
            {bankAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.bank_name} — {a.account_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">To account</span>
          <select name="toBankAccountId" required className={input}>
            <option value="">Select…</option>
            {bankAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.bank_name} — {a.account_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Amount</span>
          <input name="requestedAmount" type="number" step="0.01" min={0.01} required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Transfer date (optional)</span>
          <input name="transferDate" type="date" className={input} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Reason (optional)</span>
          <input name="requestReason" className={input} />
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={pending || bankAccounts.length < 2}
            className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black hover:bg-amber-500 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Create transfer request"}
          </button>
        </div>
      </form>
    </div>
  );
}

type ReconRow = { id: string; reconciliation_name: string; reconciliation_status: string };

export function ReconciliationLifecycleForm({
  workspace,
  reconciliations,
}: {
  workspace: FinanceWorkspace;
  reconciliations: ReconRow[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const approveCandidates = reconciliations.filter((r) =>
    ["draft", "in_review"].includes(r.reconciliation_status)
  );
  const closeCandidates = reconciliations.filter((r) => r.reconciliation_status === "approved");

  return (
    <div className="wf-card space-y-6">
      <div>
        <h2 className="text-sm font-medium text-neutral-200">Reconciliation workflow</h2>
        <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
          Approve while status is draft or in review. Close only after approval.
        </p>
      </div>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}

      <div className="space-y-3 border-b border-white/10 pb-6">
        <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Approve</h3>
        <form
          className="flex flex-col gap-3 text-sm"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              setMsg(null);
              const res = await approveReconciliation({
                tenantId: workspace.tenantId,
                entityId: workspace.entityId,
                reconciliationId: String(fd.get("reconciliationIdApprove") ?? ""),
              });
              setMsg(res.message);
              if (res.success) {
                (e.target as HTMLFormElement).reset();
                router.refresh();
              }
            });
          }}
        >
          <select name="reconciliationIdApprove" required className={input}>
            <option value="">Select reconciliation…</option>
            {approveCandidates.map((r) => (
              <option key={r.id} value={r.id}>
                {r.reconciliation_name} — {r.reconciliation_status}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={pending || !approveCandidates.length}
            className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black hover:bg-amber-500 disabled:opacity-50 w-fit"
          >
            {pending ? "Working…" : "Approve reconciliation"}
          </button>
        </form>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Close</h3>
        <form
          className="flex flex-col gap-3 text-sm"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              setMsg(null);
              const res = await closeReconciliation({
                tenantId: workspace.tenantId,
                entityId: workspace.entityId,
                reconciliationId: String(fd.get("reconciliationIdClose") ?? ""),
              });
              setMsg(res.message);
              if (res.success) {
                (e.target as HTMLFormElement).reset();
                router.refresh();
              }
            });
          }}
        >
          <select name="reconciliationIdClose" required className={input}>
            <option value="">Select reconciliation…</option>
            {closeCandidates.map((r) => (
              <option key={r.id} value={r.id}>
                {r.reconciliation_name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={pending || !closeCandidates.length}
            className="rounded-md border border-white/15 bg-white/5 px-4 py-2 text-sm text-neutral-200 hover:bg-white/10 disabled:opacity-50 w-fit"
          >
            {pending ? "Working…" : "Close reconciliation"}
          </button>
        </form>
      </div>
    </div>
  );
}

type TxRow = { id: string; amount: string | number; description: string; transaction_date: string };

export function MatchBankTransactionForm({
  workspace,
  reconciliations,
  transactions,
}: {
  workspace: FinanceWorkspace;
  reconciliations: ReconRow[];
  transactions: TxRow[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [txId, setTxId] = useState("");
  const [matchAmount, setMatchAmount] = useState("");

  useEffect(() => {
    const t = transactions.find((x) => x.id === txId);
    if (t) setMatchAmount(String(t.amount));
    else setMatchAmount("");
  }, [txId, transactions]);

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Match transaction to reconciliation</h2>
      <p className="text-xs text-neutral-500 leading-relaxed">
        Links a bank line to an open reconciliation and marks it matched. AR/AP payment links are optional for this
        pack.
      </p>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await matchBankTransaction({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              reconciliationId: String(fd.get("reconciliationId") ?? ""),
              bankTransactionId: String(fd.get("bankTransactionId") ?? ""),
              matchAmount: Number(fd.get("matchAmount") ?? 0),
            });
            setMsg(res.message);
            if (res.success) {
              (e.target as HTMLFormElement).reset();
              setTxId("");
              setMatchAmount("");
              router.refresh();
            }
          });
        }}
      >
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Reconciliation (draft / in review)</span>
          <select name="reconciliationId" required className={input}>
            <option value="">Select…</option>
            {reconciliations.map((r) => (
              <option key={r.id} value={r.id}>
                {r.reconciliation_name} — {r.reconciliation_status}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Bank transaction (unmatched)</span>
          <select
            name="bankTransactionId"
            required
            className={input}
            value={txId}
            onChange={(e) => setTxId(e.target.value)}
          >
            <option value="">Select…</option>
            {transactions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.transaction_date} — {String(t.description).slice(0, 40)}
                {String(t.description).length > 40 ? "…" : ""} ({t.amount})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Match amount</span>
          <input
            name="matchAmount"
            type="number"
            step="0.01"
            required
            className={input}
            value={matchAmount}
            onChange={(e) => setMatchAmount(e.target.value)}
          />
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={pending || !reconciliations.length || !transactions.length}
            className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black hover:bg-amber-500 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Record match"}
          </button>
        </div>
      </form>
    </div>
  );
}

type TransferPickRow = { id: string; transfer_status: string; requested_amount: string | number };

export function ApproveTransferRequestForm({
  workspace,
  submittedTransfers,
}: {
  workspace: FinanceWorkspace;
  submittedTransfers: TransferPickRow[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Approve transfer request</h2>
      <p className="text-xs text-neutral-500 leading-relaxed">Only requests in submitted status are listed.</p>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await approveTransferRequest({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              transferRequestId: String(fd.get("transferRequestId") ?? ""),
            });
            setMsg(res.message);
            if (res.success) {
              (e.target as HTMLFormElement).reset();
              router.refresh();
            }
          });
        }}
      >
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Transfer request</span>
          <select name="transferRequestId" required className={input}>
            <option value="">Select…</option>
            {submittedTransfers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.id.slice(0, 8)}… — {t.requested_amount} ({t.transfer_status})
              </option>
            ))}
          </select>
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={pending || !submittedTransfers.length}
            className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black hover:bg-amber-500 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Approve transfer"}
          </button>
        </div>
      </form>
    </div>
  );
}
