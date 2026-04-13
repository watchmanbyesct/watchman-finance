"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { FinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { createCatalogCategory, createCatalogItem, createCatalogItemPrice } from "@/modules/catalog/actions/catalog-actions";
import {
  createBillingRule,
  createBillableEventCandidate,
  resolveBillingException,
} from "@/modules/billing/actions/billing-actions";
import {
  applyInventoryStockReceipt,
  createEmployeeItemIssue,
  createInventoryCategory,
  createInventoryItem,
  createInventoryLocation,
  registerEquipmentAsset,
} from "@/modules/inventory/actions/inventory-actions";

const input =
  "rounded-md border border-white/10 bg-white/5 px-3 py-2 text-neutral-200 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/40";

type CatItem = { id: string; item_code: string; item_name: string };

export function CatalogCategoryForm({ workspace }: { workspace: FinanceWorkspace }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Add catalog category</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createCatalogCategory({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              categoryCode: String(fd.get("categoryCode") ?? "").trim(),
              categoryName: String(fd.get("categoryName") ?? "").trim(),
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
          <span className="text-neutral-500 text-xs">Category code</span>
          <input name="categoryCode" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Category name</span>
          <input name="categoryName" required className={input} />
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
            {pending ? "Saving…" : "Create category"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function CatalogItemForm({ workspace }: { workspace: FinanceWorkspace }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Add catalog item</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createCatalogItem({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              itemCode: String(fd.get("itemCode") ?? "").trim(),
              itemName: String(fd.get("itemName") ?? "").trim(),
              description: String(fd.get("description") ?? "").trim() || undefined,
              itemTypeCode: String(fd.get("itemTypeCode") ?? "service") as "service" | "product" | "fee" | "bundle" | "adjustment" | "discount",
              billingMethod: String(fd.get("billingMethod") ?? "flat_fee") as
                | "hourly"
                | "flat_fee"
                | "per_visit"
                | "per_incident"
                | "recurring_monthly"
                | "quantity",
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
          <span className="text-neutral-500 text-xs">Item code</span>
          <input name="itemCode" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Item name</span>
          <input name="itemName" required className={input} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Description</span>
          <input name="description" className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Item type</span>
          <select name="itemTypeCode" className={input}>
            <option value="service">service</option>
            <option value="product">product</option>
            <option value="fee">fee</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Billing method</span>
          <select name="billingMethod" className={input}>
            <option value="flat_fee">flat_fee</option>
            <option value="hourly">hourly</option>
            <option value="quantity">quantity</option>
          </select>
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
            {pending ? "Saving…" : "Create item"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function CatalogPriceForm({
  workspace,
  catalogItems,
}: {
  workspace: FinanceWorkspace;
  catalogItems: CatItem[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Add catalog price</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createCatalogItemPrice({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              catalogItemId: String(fd.get("catalogItemId") ?? ""),
              priceName: String(fd.get("priceName") ?? "").trim(),
              unitPrice: Number(fd.get("unitPrice") ?? 0),
              effectiveStartDate: String(fd.get("effectiveStartDate") ?? ""),
              effectiveEndDate: String(fd.get("effectiveEndDate") ?? "").trim() || undefined,
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
          <span className="text-neutral-500 text-xs">Catalog item</span>
          <select name="catalogItemId" required className={input}>
            <option value="">Select…</option>
            {catalogItems.map((c) => (
              <option key={c.id} value={c.id}>
                {c.item_code} — {c.item_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Price name</span>
          <input name="priceName" required className={input} placeholder="List" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Unit price</span>
          <input name="unitPrice" type="number" step="0.01" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Effective start</span>
          <input name="effectiveStartDate" type="date" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Effective end</span>
          <input name="effectiveEndDate" type="date" className={input} />
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending || !catalogItems.length} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
            {pending ? "Saving…" : "Create price"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function BillingRuleForm({ workspace }: { workspace: FinanceWorkspace }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Add billing rule</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createBillingRule({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              ruleCode: String(fd.get("ruleCode") ?? "").trim(),
              ruleName: String(fd.get("ruleName") ?? "").trim(),
              billingTrigger: String(fd.get("billingTrigger") ?? "manual") as "manual" | "service_event" | "shift_completed" | "scheduled_post" | "recurring",
              billingFrequency: String(fd.get("billingFrequency") ?? "one_time") as
                | "one_time"
                | "daily"
                | "weekly"
                | "monthly"
                | "event_driven",
              rateSource: String(fd.get("rateSource") ?? "catalog") as "catalog" | "customer_override" | "contract_override" | "manual",
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
          <span className="text-neutral-500 text-xs">Rule code</span>
          <input name="ruleCode" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Rule name</span>
          <input name="ruleName" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Trigger</span>
          <select name="billingTrigger" className={input}>
            <option value="manual">manual</option>
            <option value="service_event">service_event</option>
            <option value="recurring">recurring</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Frequency</span>
          <select name="billingFrequency" className={input}>
            <option value="one_time">one_time</option>
            <option value="monthly">monthly</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Rate source</span>
          <select name="rateSource" className={input}>
            <option value="catalog">catalog</option>
            <option value="manual">manual</option>
          </select>
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
            {pending ? "Saving…" : "Create rule"}
          </button>
        </div>
      </form>
    </div>
  );
}

type BillingExceptionOpt = {
  id: string;
  exception_code: string;
  exception_message: string;
  resolution_status: string;
};

export function BillingExceptionResolveForm({
  workspace,
  openExceptions,
}: {
  workspace: FinanceWorkspace;
  openExceptions: BillingExceptionOpt[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Resolve billing exception</h2>
      <p className="text-xs text-neutral-500">Requires billing.rule.manage. Marks the row resolved or ignored and sets resolved_at.</p>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await resolveBillingException({
              tenantId: workspace.tenantId,
              exceptionId: String(fd.get("exceptionId") ?? ""),
              resolutionStatus: String(fd.get("resolutionStatus") ?? "resolved") as "resolved" | "ignored",
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
          <span className="text-neutral-500 text-xs">Open exception</span>
          <select name="exceptionId" required className={input} disabled={!openExceptions.length}>
            <option value="">Select…</option>
            {openExceptions.map((x) => (
              <option key={x.id} value={x.id}>
                {x.exception_code} — {String(x.exception_message).slice(0, 60)}
                {String(x.exception_message).length > 60 ? "…" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Resolution</span>
          <select name="resolutionStatus" className={input}>
            <option value="resolved">resolved</option>
            <option value="ignored">ignored</option>
          </select>
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={pending || !openExceptions.length}
            className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black"
          >
            {pending ? "Saving…" : "Apply resolution"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function BillableCandidateForm({ workspace }: { workspace: FinanceWorkspace }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Record billable candidate</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createBillableEventCandidate({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              sourceTable: String(fd.get("sourceTable") ?? "").trim(),
              sourceRecordId: String(fd.get("sourceRecordId") ?? "").trim(),
              quantity: Number(fd.get("quantity") ?? 1) || 1,
              candidateDate: String(fd.get("candidateDate") ?? "").trim() || undefined,
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
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Source table</span>
          <input name="sourceTable" required className={input} placeholder="shifts" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Source record id</span>
          <input name="sourceRecordId" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Quantity</span>
          <input name="quantity" type="number" step="0.01" defaultValue={1} className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Candidate date</span>
          <input name="candidateDate" type="date" className={input} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Notes</span>
          <input name="notes" className={input} />
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
            {pending ? "Saving…" : "Create candidate"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function InventoryCategoryForm({ workspace }: { workspace: FinanceWorkspace }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Add inventory category</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createInventoryCategory({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              categoryCode: String(fd.get("categoryCode") ?? "").trim(),
              categoryName: String(fd.get("categoryName") ?? "").trim(),
              categoryType: String(fd.get("categoryType") ?? "inventory") as "inventory" | "asset" | "supply" | "uniform" | "equipment" | "other",
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
          <span className="text-neutral-500 text-xs">Code</span>
          <input name="categoryCode" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Name</span>
          <input name="categoryName" required className={input} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Type</span>
          <select name="categoryType" className={input}>
            <option value="inventory">inventory</option>
            <option value="equipment">equipment</option>
          </select>
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
            {pending ? "Saving…" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function InventoryLocationForm({ workspace }: { workspace: FinanceWorkspace }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Add inventory location</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createInventoryLocation({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              locationCode: String(fd.get("locationCode") ?? "").trim(),
              locationName: String(fd.get("locationName") ?? "").trim(),
              locationType: String(fd.get("locationType") ?? "warehouse") as "warehouse" | "office" | "vehicle" | "site" | "other",
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
          <span className="text-neutral-500 text-xs">Location code</span>
          <input name="locationCode" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Location name</span>
          <input name="locationName" required className={input} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Type</span>
          <select name="locationType" className={input}>
            <option value="warehouse">warehouse</option>
            <option value="office">office</option>
            <option value="vehicle">vehicle</option>
          </select>
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
            {pending ? "Saving…" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function InventoryItemForm({ workspace }: { workspace: FinanceWorkspace }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Add inventory item</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createInventoryItem({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              itemCode: String(fd.get("itemCode") ?? "").trim(),
              itemName: String(fd.get("itemName") ?? "").trim(),
              description: String(fd.get("description") ?? "").trim() || undefined,
              trackingMode: String(fd.get("trackingMode") ?? "quantity") as "quantity" | "serial" | "asset",
              unitOfMeasure: "each",
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
          <span className="text-neutral-500 text-xs">Item code</span>
          <input name="itemCode" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Item name</span>
          <input name="itemName" required className={input} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Description</span>
          <input name="description" className={input} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Tracking</span>
          <select name="trackingMode" className={input}>
            <option value="quantity">quantity</option>
            <option value="serial">serial</option>
            <option value="asset">asset</option>
          </select>
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
            {pending ? "Saving…" : "Create item"}
          </button>
        </div>
      </form>
    </div>
  );
}

type InvItemPick = { id: string; item_code: string; item_name: string };
type InvLocPick = { id: string; location_code: string; location_name: string };

export function InventoryStockReceiptForm({
  workspace,
  items,
  locations,
}: {
  workspace: FinanceWorkspace;
  items: InvItemPick[];
  locations: InvLocPick[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Receive stock</h2>
      <p className="text-xs text-neutral-500 leading-relaxed">
        Increments on-hand and available quantity for the item at the selected location (creates a balance row if
        needed).
      </p>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await applyInventoryStockReceipt({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              inventoryItemId: String(fd.get("inventoryItemId") ?? ""),
              inventoryLocationId: String(fd.get("inventoryLocationId") ?? ""),
              quantityReceived: Number(fd.get("quantityReceived") ?? 0),
              unitCost: Number(fd.get("unitCost") ?? "") || undefined,
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
          <span className="text-neutral-500 text-xs">Item</span>
          <select name="inventoryItemId" required className={input}>
            <option value="">Select…</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.item_code} — {i.item_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Location</span>
          <select name="inventoryLocationId" required className={input}>
            <option value="">Select…</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.location_code} — {l.location_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Quantity received</span>
          <input name="quantityReceived" type="number" step="0.01" min={0.01} required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Unit cost (optional)</span>
          <input name="unitCost" type="number" step="0.0001" min={0} className={input} />
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={pending || !items.length || !locations.length}
            className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
          >
            {pending ? "Saving…" : "Apply receipt"}
          </button>
        </div>
      </form>
    </div>
  );
}

type PersonPick = { id: string; legal_first_name: string; legal_last_name: string };

export function EmployeeItemIssueForm({
  workspace,
  items,
  people,
}: {
  workspace: FinanceWorkspace;
  items: InvItemPick[];
  people: PersonPick[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Record item issue</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const res = await createEmployeeItemIssue({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              financePersonId: String(fd.get("financePersonId") ?? ""),
              inventoryItemId: String(fd.get("inventoryItemId") ?? ""),
              issueQuantity: Number(fd.get("issueQuantity") ?? 1) || 1,
              issueDate: String(fd.get("issueDate") ?? "").trim() || undefined,
              returnDueDate: String(fd.get("returnDueDate") ?? "").trim() || undefined,
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
          <span className="text-neutral-500 text-xs">Person</span>
          <select name="financePersonId" required className={input}>
            <option value="">Select…</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.legal_last_name}, {p.legal_first_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Item</span>
          <select name="inventoryItemId" required className={input}>
            <option value="">Select…</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.item_code} — {i.item_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Quantity</span>
          <input name="issueQuantity" type="number" step="0.01" min={0.01} defaultValue={1} required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Issue date</span>
          <input name="issueDate" type="date" className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Return due</span>
          <input name="returnDueDate" type="date" className={input} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Notes (optional)</span>
          <input name="notes" className={input} />
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={pending || !items.length || !people.length}
            className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
          >
            {pending ? "Saving…" : "Create issue"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function RegisterEquipmentAssetForm({
  workspace,
  items,
}: {
  workspace: FinanceWorkspace;
  items: InvItemPick[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="wf-card space-y-3">
      <h2 className="text-sm font-medium text-neutral-200">Register equipment asset</h2>
      {msg && <p className="text-xs text-amber-400">{msg}</p>}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setMsg(null);
            const link = String(fd.get("inventoryItemId") ?? "").trim();
            const res = await registerEquipmentAsset({
              tenantId: workspace.tenantId,
              entityId: workspace.entityId,
              assetTag: String(fd.get("assetTag") ?? "").trim(),
              assetName: String(fd.get("assetName") ?? "").trim(),
              inventoryItemId: link || undefined,
              purchaseDate: String(fd.get("purchaseDate") ?? "").trim() || undefined,
              purchaseCost: Number(fd.get("purchaseCost") ?? "") || undefined,
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
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Asset tag</span>
          <input name="assetTag" required className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Asset name</span>
          <input name="assetName" required className={input} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Link to inventory item (optional)</span>
          <select name="inventoryItemId" className={input}>
            <option value="">—</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.item_code} — {i.item_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Purchase date</span>
          <input name="purchaseDate" type="date" className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs">Purchase cost</span>
          <input name="purchaseCost" type="number" step="0.01" min={0} className={input} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-neutral-500 text-xs">Notes (optional)</span>
          <input name="notes" className={input} />
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending} className="rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black">
            {pending ? "Saving…" : "Register asset"}
          </button>
        </div>
      </form>
    </div>
  );
}
