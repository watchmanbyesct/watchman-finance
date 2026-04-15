/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { FinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import {
  createArCollectionTask,
  createArStatementRun,
  createCreditMemo,
  createCustomer,
  createCustomerSite,
  createInvoiceDraft,
  recordInvoicePayment,
} from "@/modules/ar/actions/ar-actions";
import type { Account } from "@/types";

const input =
  "rounded-md border border-white/10 bg-white/5 px-3 py-2 text-neutral-200 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/40";

type CustomerRow = { id: string; display_name: string; customer_code: string };

export function CustomerCreateForm({ workspace }: { workspace: FinanceWorkspace }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Add customer</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createCustomer({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              customerCode: String(fd.get("customerCode") ?? "").trim(),
              legalName: String(fd.get("legalName") ?? "").trim(),
              displayName: String(fd.get("displayName") ?? "").trim(),
              billingEmail: String(fd.get("billingEmail") ?? "").trim() || undefined,
              paymentTermsDays: Number(fd.get("paymentTermsDays") ?? 30) || 30,
            });
            setMsg(res.success ? res.message : res.message);
            if (res.success) {
              (e.target as HTMLFormElement).reset();
              router.refresh();
            }
          });
        }}
      >
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Customer code</span>
          <input name="customerCode" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Legal name</span>
          <input name="legalName" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Display name</span>
          <input name="displayName" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Billing email (optional)</span>
          <input name="billingEmail" type="email" className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Payment terms (days)</span>
          <input name="paymentTermsDays" type="number" min={0} max={365} defaultValue={30} className={input} />
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black hover:bg-amber-500 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Create customer"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function InvoiceDraftForm({
  workspace,
  customers,
  revenueAccounts,
}: {
  workspace: FinanceWorkspace;
  customers: CustomerRow[];
  revenueAccounts: Pick<Account, "id" | "code" | "name" | "accountType">[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const rev = revenueAccounts.filter((a) => a.accountType?.toLowerCase() === "revenue");

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Create invoice draft</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const revenueAccountId = String(fd.get("revenueAccountId") ?? "");
          start(async () => {
            setMsg(null);
            const res = await createInvoiceDraft({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              customerId: String(fd.get("customerId") ?? ""),
              invoiceNumber: String(fd.get("invoiceNumber") ?? "").trim(),
              currencyCode: "USD",
              sourceType: "manual",
              issueDate: String(fd.get("issueDate") ?? "").trim() || undefined,
              dueDate: String(fd.get("dueDate") ?? "").trim() || undefined,
              memo: String(fd.get("memo") ?? "").trim() || undefined,
              lines: [
                {
                  description: String(fd.get("lineDescription") ?? "").trim() || "Line 1",
                  quantity: Number(fd.get("quantity") ?? 1) || 1,
                  unitPrice: Number(fd.get("unitPrice") ?? 0) || 0,
                  revenueAccountId,
                  lineType: "service",
                },
              ],
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
          <span className="text-neutral-500 text-xs">Customer</span>
          <select name="customerId" required className={input}>
            <option value="">Select…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.customer_code} — {c.display_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Invoice number</span>
          <input name="invoiceNumber" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Revenue account</span>
          <select name="revenueAccountId" required className={input}>
            <option value="">Select…</option>
            {rev.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} — {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Issue date</span>
          <input name="issueDate" type="date" className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Due date</span>
          <input name="dueDate" type="date" className={input} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Line description</span>
          <input name="lineDescription" className={input} placeholder="Services" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Quantity</span>
          <input name="quantity" type="number" step="0.01" min={0.01} defaultValue={1} className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Unit price</span>
          <input name="unitPrice" type="number" step="0.01" min={0} defaultValue={0} className={input} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Memo (optional)</span>
          <input name="memo" className={input} />
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={pending || !customers.length || !rev.length}
            className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black hover:bg-amber-500 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Create draft"}
          </button>
        </div>
      </form>
    </div>
  );
}

type InvRow = { id: string; customer_id: string; invoice_number: string; invoice_status: string };

export function RecordPaymentForm({
  workspace,
  customers,
  invoices,
}: {
  workspace: FinanceWorkspace;
  customers: CustomerRow[];
  invoices: InvRow[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [cust, setCust] = useState("");

  const filtered = cust ? invoices.filter((i) => i.customer_id === cust && i.invoice_status !== "draft") : [];

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Record payment</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const invoiceIdRaw = String(fd.get("invoiceId") ?? "").trim();
          start(async () => {
            setMsg(null);
            const res = await recordInvoicePayment({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              customerId: String(fd.get("customerId") ?? ""),
              invoiceId: invoiceIdRaw || undefined,
              paymentMethod: String(fd.get("paymentMethod") ?? "manual") as "manual" | "ach" | "card" | "check" | "other",
              paymentDate: String(fd.get("paymentDate") ?? ""),
              amountReceived: Number(fd.get("amountReceived") ?? 0),
              paymentReference: String(fd.get("paymentReference") ?? "").trim() || undefined,
            });
            setMsg(res.message);
            if (res.success) {
              (e.target as HTMLFormElement).reset();
              setCust("");
              router.refresh();
            }
          });
        }}
      >
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Customer</span>
          <select
            name="customerId"
            required
            className={input}
            value={cust}
            onChange={(e) => setCust(e.target.value)}
          >
            <option value="">Select…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.customer_code} — {c.display_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Apply to invoice (optional)</span>
          <select name="invoiceId" className={input} disabled={!cust}>
            <option value="">Unapplied payment</option>
            {filtered.map((i) => (
              <option key={i.id} value={i.id}>
                {i.invoice_number} ({i.invoice_status})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Payment date</span>
          <input name="paymentDate" type="date" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Amount</span>
          <input name="amountReceived" type="number" step="0.01" min={0.01} required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Method</span>
          <select name="paymentMethod" className={input}>
            <option value="manual">manual</option>
            <option value="ach">ach</option>
            <option value="card">card</option>
            <option value="check">check</option>
            <option value="other">other</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Reference (optional)</span>
          <input name="paymentReference" className={input} />
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={pending || !customers.length}
            className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black hover:bg-amber-500 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Record payment"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function CustomerSiteCreateForm({ workspace, customers }: { workspace: FinanceWorkspace; customers: CustomerRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Add customer site</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createCustomerSite({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              customerId: String(fd.get("customerId") ?? ""),
              siteCode: String(fd.get("siteCode") ?? "").trim(),
              siteName: String(fd.get("siteName") ?? "").trim(),
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
          <span className="text-neutral-500 text-xs">Customer</span>
          <select name="customerId" required className={input}>
            <option value="">Select…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.customer_code} — {c.display_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Site code</span>
          <input name="siteCode" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Site name</span>
          <input name="siteName" required className={input} />
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={pending || !customers.length}
            className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black hover:bg-amber-500 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Create site"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function CreditMemoCreateForm({
  workspace,
  customers,
  invoices,
}: {
  workspace: FinanceWorkspace;
  customers: CustomerRow[];
  invoices: InvRow[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [cust, setCust] = useState("");
  const filtered = cust ? invoices.filter((i) => i.customer_id === cust && i.invoice_status !== "void") : [];

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Create credit memo (draft)</h2>
      <p className="text-xs text-neutral-500">Application to open AR is a follow-on workflow.</p>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const invRaw = String(fd.get("invoiceId") ?? "").trim();
          start(async () => {
            setMsg(null);
            const res = await createCreditMemo({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              customerId: String(fd.get("customerId") ?? ""),
              memoNumber: String(fd.get("memoNumber") ?? "").trim(),
              totalAmount: Number(fd.get("totalAmount") ?? 0),
              issueDate: String(fd.get("issueDate") ?? "").trim() || undefined,
              invoiceId: invRaw || undefined,
              reason: String(fd.get("reason") ?? "").trim() || undefined,
            });
            setMsg(res.message);
            if (res.success) {
              (e.target as HTMLFormElement).reset();
              setCust("");
              router.refresh();
            }
          });
        }}
      >
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Customer</span>
          <select
            name="customerId"
            required
            className={input}
            value={cust}
            onChange={(e) => setCust(e.target.value)}
          >
            <option value="">Select…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.customer_code} — {c.display_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Memo number</span>
          <input name="memoNumber" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Amount</span>
          <input name="totalAmount" type="number" step="0.01" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Issue date</span>
          <input name="issueDate" type="date" className={input} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Related invoice (optional)</span>
          <select name="invoiceId" className={input} disabled={!cust}>
            <option value="">None</option>
            {filtered.map((i) => (
              <option key={i.id} value={i.id}>
                {i.invoice_number} ({i.invoice_status})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Reason (optional)</span>
          <input name="reason" className={input} />
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={pending || !customers.length}
            className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black hover:bg-amber-500 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Create credit memo"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function ArStatementRunForm({
  workspace,
  customers,
}: {
  workspace: FinanceWorkspace;
  customers: CustomerRow[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Request customer statement</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createArStatementRun({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              customerId: String(fd.get("customerId") ?? ""),
              statementThroughDate: String(fd.get("statementThroughDate") ?? ""),
              outputFormat: String(fd.get("outputFormat") ?? "summary") as "summary" | "pdf" | "csv",
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
          <span className="text-neutral-500 text-xs">Customer</span>
          <select name="customerId" required className={input}>
            <option value="">Select…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.customer_code} — {c.display_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Statement through</span>
          <input name="statementThroughDate" type="date" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Output format</span>
          <select name="outputFormat" className={input}>
            <option value="summary">summary</option>
            <option value="pdf">pdf</option>
            <option value="csv">csv</option>
          </select>
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={pending || !customers.length}
            className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black hover:bg-amber-500 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Queue statement run"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function ArCollectionTaskForm({
  workspace,
  customers,
}: {
  workspace: FinanceWorkspace;
  customers: CustomerRow[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Open collection case</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createArCollectionTask({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              customerId: String(fd.get("customerId") ?? ""),
              caseCode: String(fd.get("caseCode") ?? "").trim(),
              subject: String(fd.get("subject") ?? "").trim(),
              priority: String(fd.get("priority") ?? "normal") as "low" | "normal" | "high" | "critical",
              notes: String(fd.get("notes") ?? "").trim() || undefined,
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
          <span className="text-neutral-500 text-xs">Customer</span>
          <select name="customerId" required className={input}>
            <option value="">Select…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.customer_code} — {c.display_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Case code</span>
          <input name="caseCode" required className={input} placeholder="COL-2026-001" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Priority</span>
          <select name="priority" className={input}>
            <option value="low">low</option>
            <option value="normal">normal</option>
            <option value="high">high</option>
            <option value="critical">critical</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Subject</span>
          <input name="subject" required className={input} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Notes (optional)</span>
          <input name="notes" className={input} />
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={pending || !customers.length}
            className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black hover:bg-amber-500 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Create task"}
          </button>
        </div>
      </form>
    </div>
  );
}
