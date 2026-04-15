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
  createApRecurringVendorCharge,
  createVendor,
  createBillDraft,
  recordVendorPayment,
} from "@/modules/ap/actions/ap-actions";

const input =
  "rounded-md border border-white/10 bg-white/5 px-3 py-2 text-neutral-200 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/40";

type VendorRow = { id: string; display_name: string; vendor_code: string };
type BillRow = { id: string; vendor_id: string; bill_number: string; bill_status: string };

export function VendorCreateForm({ workspace }: { workspace: FinanceWorkspace }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Add vendor</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createVendor({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              vendorCode: String(fd.get("vendorCode") ?? "").trim(),
              legalName: String(fd.get("legalName") ?? "").trim(),
              displayName: String(fd.get("displayName") ?? "").trim(),
              remitEmail: String(fd.get("remitEmail") ?? "").trim() || undefined,
              paymentTermsDays: Number(fd.get("paymentTermsDays") ?? 30) || 30,
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
          <span className="text-neutral-500 text-xs">Vendor code</span>
          <input name="vendorCode" required className={input} />
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
          <span className="text-neutral-500 text-xs">Remit email (optional)</span>
          <input name="remitEmail" type="email" className={input} />
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
            {pending ? "Saving…" : "Create vendor"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function BillDraftForm({ workspace, vendors }: { workspace: FinanceWorkspace; vendors: VendorRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Create bill draft</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createBillDraft({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              vendorId: String(fd.get("vendorId") ?? ""),
              billNumber: String(fd.get("billNumber") ?? "").trim(),
              currencyCode: "USD",
              vendorInvoiceNumber: String(fd.get("vendorInvoiceNumber") ?? "").trim() || undefined,
              billDate: String(fd.get("billDate") ?? "").trim() || undefined,
              dueDate: String(fd.get("dueDate") ?? "").trim() || undefined,
              memo: String(fd.get("memo") ?? "").trim() || undefined,
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
          <span className="text-neutral-500 text-xs">Vendor</span>
          <select name="vendorId" required className={input}>
            <option value="">Select…</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.vendor_code} — {v.display_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Bill number</span>
          <input name="billNumber" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Vendor invoice # (optional)</span>
          <input name="vendorInvoiceNumber" className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Bill date</span>
          <input name="billDate" type="date" className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Due date</span>
          <input name="dueDate" type="date" className={input} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Memo (optional)</span>
          <input name="memo" className={input} />
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={pending || !vendors.length}
            className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black hover:bg-amber-500 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Create bill draft"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function VendorPaymentForm({
  workspace,
  vendors,
  bills,
}: {
  workspace: FinanceWorkspace;
  vendors: VendorRow[];
  bills: BillRow[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [vendor, setVendor] = useState("");
  const filtered = vendor ? bills.filter((b) => b.vendor_id === vendor && b.bill_status !== "draft") : [];

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Record vendor payment</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const billId = String(fd.get("billId") ?? "").trim();
          start(async () => {
            setMsg(null);
            const res = await recordVendorPayment({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              vendorId: String(fd.get("vendorId") ?? ""),
              billId: billId || undefined,
              paymentMethod: String(fd.get("paymentMethod") ?? "manual") as "manual" | "ach" | "check" | "wire" | "other",
              paymentDate: String(fd.get("paymentDate") ?? ""),
              amountPaid: Number(fd.get("amountPaid") ?? 0),
              paymentReference: String(fd.get("paymentReference") ?? "").trim() || undefined,
            });
            setMsg(res.message);
            if (res.success) {
              (e.target as HTMLFormElement).reset();
              setVendor("");
              router.refresh();
            }
          });
        }}
      >
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Vendor</span>
          <select
            name="vendorId"
            required
            className={input}
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
          >
            <option value="">Select…</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.vendor_code} — {v.display_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Apply to bill (optional)</span>
          <select name="billId" className={input} disabled={!vendor}>
            <option value="">Unapplied payment</option>
            {filtered.map((b) => (
              <option key={b.id} value={b.id}>
                {b.bill_number} ({b.bill_status})
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
          <input name="amountPaid" type="number" step="0.01" min={0.01} required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Method</span>
          <select name="paymentMethod" className={input}>
            <option value="manual">manual</option>
            <option value="ach">ach</option>
            <option value="check">check</option>
            <option value="wire">wire</option>
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
            disabled={pending || !vendors.length}
            className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black hover:bg-amber-500 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Record payment"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function ApRecurringChargeForm({
  workspace,
  vendors,
}: {
  workspace: FinanceWorkspace;
  vendors: VendorRow[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Add recurring vendor charge</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const next = String(fd.get("nextExpectedDate") ?? "").trim();
            const res = await createApRecurringVendorCharge({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              vendorId: String(fd.get("vendorId") ?? ""),
              chargeCode: String(fd.get("chargeCode") ?? "").trim(),
              description: String(fd.get("description") ?? "").trim() || undefined,
              amountEstimate: Number(fd.get("amountEstimate") ?? 0),
              cadence: String(fd.get("cadence") ?? "monthly") as
                | "weekly"
                | "biweekly"
                | "monthly"
                | "quarterly"
                | "annual"
                | "other",
              nextExpectedDate: next || undefined,
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
          <span className="text-neutral-500 text-xs">Vendor</span>
          <select name="vendorId" required className={input}>
            <option value="">Select…</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.vendor_code} — {v.display_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Charge code</span>
          <input name="chargeCode" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Amount estimate</span>
          <input name="amountEstimate" type="number" step="0.01" min={0} required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Cadence</span>
          <select name="cadence" className={input}>
            <option value="weekly">weekly</option>
            <option value="biweekly">biweekly</option>
            <option value="monthly">monthly</option>
            <option value="quarterly">quarterly</option>
            <option value="annual">annual</option>
            <option value="other">other</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Next expected date</span>
          <input name="nextExpectedDate" type="date" className={input} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Description (optional)</span>
          <input name="description" className={input} />
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={pending || !vendors.length}
            className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black hover:bg-amber-500 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save recurring charge"}
          </button>
        </div>
      </form>
    </div>
  );
}
