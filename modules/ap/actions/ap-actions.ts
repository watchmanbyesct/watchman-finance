"use server";

import { createSupabaseAdminClient } from "@/lib/db/supabase-server";
import { resolveRequestContext } from "@/lib/context/resolve-request-context";
import { requirePermission, requireEntityScope, requireModuleEntitlement } from "@/lib/permissions/require-permission";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { mapErrorToResult, type ActionResult } from "@/lib/errors/app-error";
import { z } from "zod";

async function refreshBillTotals(admin: ReturnType<typeof createSupabaseAdminClient>, billId: string) {
  const { data: lines, error: le } = await admin.from("bill_lines").select("line_amount").eq("bill_id", billId);
  if (le) throw new Error(le.message);
  const subtotal = (lines ?? []).reduce((s: number, r: { line_amount: string | number }) => s + Number(r.line_amount), 0);
  const tax = 0;
  const total = subtotal + tax;
  const { data: bill, error: be } = await admin
    .from("bills")
    .select("bill_status, balance_due, total_amount")
    .eq("id", billId)
    .single();
  if (be || !bill) throw new Error(be?.message ?? "not_found:bill");
  if (bill.bill_status === "void") {
    const { error: ue } = await admin
      .from("bills")
      .update({ subtotal_amount: subtotal, tax_amount: tax, total_amount: total })
      .eq("id", billId);
    if (ue) throw new Error(ue.message);
    return;
  }
  const paidPortion = Math.max(0, Number(bill.total_amount) - Number(bill.balance_due));
  const nextBalance = Math.max(0, Number((total - paidPortion).toFixed(2)));
  const { error: ue } = await admin
    .from("bills")
    .update({
      subtotal_amount: subtotal,
      tax_amount: tax,
      total_amount: total,
      balance_due: nextBalance,
    })
    .eq("id", billId);
  if (ue) throw new Error(ue.message);
}

const CreateVendorSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid().optional(),
  vendorCode: z.string().min(1).max(80),
  legalName: z.string().min(1),
  displayName: z.string().min(1),
  remitEmail: z.string().email().optional(),
  remitPhone: z.string().optional(),
  paymentTermsDays: z.number().int().min(0).max(365).default(30),
});

/** Permission: ap.bill.create */
export async function createVendor(
  input: z.infer<typeof CreateVendorSchema>
): Promise<ActionResult<{ vendorId: string }>> {
  try {
    const validated = CreateVendorSchema.parse(input);
    const ctx = await resolveRequestContext(validated.tenantId);
    requireModuleEntitlement(ctx, "ap");
    requirePermission(ctx, "ap.bill.create");
    if (validated.entityId) requireEntityScope(ctx, validated.entityId);

    const admin = createSupabaseAdminClient();
    const { data: row, error } = await admin
      .from("vendors")
      .insert({
        tenant_id: validated.tenantId,
        entity_id: validated.entityId ?? null,
        vendor_code: validated.vendorCode,
        legal_name: validated.legalName,
        display_name: validated.displayName,
        remit_email: validated.remitEmail ?? null,
        remit_phone: validated.remitPhone ?? null,
        payment_terms_days: validated.paymentTermsDays,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: validated.tenantId,
      entityId: validated.entityId ?? null,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "ap",
      actionCode: "ap.vendor.create",
      targetTable: "vendors",
      targetRecordId: row.id,
      newValues: { vendorCode: validated.vendorCode },
    });

    return { success: true, message: "Vendor created.", data: { vendorId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const CreateBillDraftSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid(),
  vendorId: z.string().uuid(),
  billNumber: z.string().min(1).max(80),
  vendorInvoiceNumber: z.string().optional(),
  memo: z.string().optional(),
  billDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  currencyCode: z.string().length(3).default("USD"),
});

/** Permission: ap.bill.create */
export async function createBillDraft(
  input: z.infer<typeof CreateBillDraftSchema>
): Promise<ActionResult<{ billId: string }>> {
  try {
    const validated = CreateBillDraftSchema.parse(input);
    const ctx = await resolveRequestContext(validated.tenantId);
    requireModuleEntitlement(ctx, "ap");
    requirePermission(ctx, "ap.bill.create");
    requireEntityScope(ctx, validated.entityId);

    const admin = createSupabaseAdminClient();

    const { data: existing } = await admin
      .from("bills")
      .select("id")
      .eq("entity_id", validated.entityId)
      .eq("bill_number", validated.billNumber)
      .maybeSingle();

    if (existing) {
      return {
        success: false,
        message: `Bill number ${validated.billNumber} already exists for this entity.`,
        errors: [{ code: "conflict", message: "bill_number_conflict" }],
      };
    }

    const { data: bill, error } = await admin
      .from("bills")
      .insert({
        tenant_id: validated.tenantId,
        entity_id: validated.entityId,
        vendor_id: validated.vendorId,
        bill_number: validated.billNumber,
        vendor_invoice_number: validated.vendorInvoiceNumber ?? null,
        bill_status: "draft",
        memo: validated.memo ?? null,
        bill_date: validated.billDate ?? null,
        due_date: validated.dueDate ?? null,
        currency_code: validated.currencyCode,
        created_by: ctx.platformUserId,
        subtotal_amount: 0,
        tax_amount: 0,
        total_amount: 0,
        balance_due: 0,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: validated.tenantId,
      entityId: validated.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "ap",
      actionCode: "ap.bill.create",
      targetTable: "bills",
      targetRecordId: bill.id,
      newValues: { billNumber: validated.billNumber },
    });

    return { success: true, message: "Bill draft created.", data: { billId: bill.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const AddBillLineSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid(),
  billId: z.string().uuid(),
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitCost: z.number().min(0),
  expenseAccountId: z.string().uuid().optional(),
  metadataJson: z.record(z.unknown()).optional(),
});

/** Permission: ap.bill.create */
export async function addBillLine(
  input: z.infer<typeof AddBillLineSchema>
): Promise<ActionResult<{ billLineId: string }>> {
  try {
    const validated = AddBillLineSchema.parse(input);
    const ctx = await resolveRequestContext(validated.tenantId);
    requireModuleEntitlement(ctx, "ap");
    requirePermission(ctx, "ap.bill.create");
    requireEntityScope(ctx, validated.entityId);

    const admin = createSupabaseAdminClient();

    const { data: bill, error: be } = await admin
      .from("bills")
      .select("bill_status, entity_id")
      .eq("id", validated.billId)
      .eq("tenant_id", validated.tenantId)
      .single();

    if (be || !bill) return { success: false, message: "Bill not found." };
    if (bill.entity_id !== validated.entityId) {
      return { success: false, message: "Bill entity mismatch." };
    }
    if (bill.bill_status !== "draft") {
      return { success: false, message: "Lines can only be added while the bill is a draft." };
    }

    const { data: maxRow } = await admin
      .from("bill_lines")
      .select("line_number")
      .eq("bill_id", validated.billId)
      .order("line_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const lineNumber = (maxRow?.line_number ?? 0) + 1;
    const lineAmount = Number((validated.quantity * validated.unitCost).toFixed(2));

    const { data: line, error: le } = await admin
      .from("bill_lines")
      .insert({
        tenant_id: validated.tenantId,
        bill_id: validated.billId,
        line_number: lineNumber,
        description: validated.description,
        quantity: validated.quantity,
        unit_cost: validated.unitCost,
        line_amount: lineAmount,
        expense_account_id: validated.expenseAccountId ?? null,
        metadata_json: validated.metadataJson ?? {},
      })
      .select("id")
      .single();

    if (le) throw new Error(le.message);

    await refreshBillTotals(admin, validated.billId);

    await writeAuditLog({
      tenantId: validated.tenantId,
      entityId: validated.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "ap",
      actionCode: "ap.bill.line.add",
      targetTable: "bill_lines",
      targetRecordId: line.id,
      newValues: { billId: validated.billId, lineNumber },
    });

    return { success: true, message: "Bill line added.", data: { billLineId: line.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

/** Permission: ap.bill.approve */
export async function approveBill(input: {
  tenantId: string;
  entityId: string;
  billId: string;
}): Promise<ActionResult> {
  try {
    const ctx = await resolveRequestContext(input.tenantId);
    requireModuleEntitlement(ctx, "ap");
    requirePermission(ctx, "ap.bill.approve");
    requireEntityScope(ctx, input.entityId);

    const admin = createSupabaseAdminClient();

    const { data: bill, error: fe } = await admin
      .from("bills")
      .select("bill_status, bill_number")
      .eq("id", input.billId)
      .eq("tenant_id", input.tenantId)
      .eq("entity_id", input.entityId)
      .single();

    if (fe || !bill) return { success: false, message: "Bill not found." };
    if (bill.bill_status !== "draft") {
      return { success: false, message: `Bill is '${bill.bill_status}' and cannot be approved from draft.` };
    }

    const { error } = await admin
      .from("bills")
      .update({
        bill_status: "approved",
        approved_by: ctx.platformUserId,
        approved_at: new Date().toISOString(),
      })
      .eq("id", input.billId);

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: input.tenantId,
      entityId: input.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "ap",
      actionCode: "ap.bill.approve",
      targetTable: "bills",
      targetRecordId: input.billId,
      newValues: { billNumber: bill.bill_number },
    });

    return { success: true, message: `Bill ${bill.bill_number} approved.` };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const RecordVendorPaymentSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid(),
  vendorId: z.string().uuid(),
  billId: z.string().uuid().optional(),
  paymentReference: z.string().optional(),
  paymentMethod: z.enum(["manual", "ach", "check", "wire", "other"]),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amountPaid: z.number().positive(),
});

/**
 * Record a vendor payment; when billId is set, applies up to the bill balance.
 * Permission: ap.payment.release
 */
export async function recordVendorPayment(
  input: z.infer<typeof RecordVendorPaymentSchema>
): Promise<ActionResult<{ vendorPaymentId: string }>> {
  try {
    const validated = RecordVendorPaymentSchema.parse(input);
    const ctx = await resolveRequestContext(validated.tenantId);
    requireModuleEntitlement(ctx, "ap");
    requirePermission(ctx, "ap.payment.release");
    requireEntityScope(ctx, validated.entityId);

    const admin = createSupabaseAdminClient();

    if (validated.billId) {
      const { data: bill, error: be } = await admin
        .from("bills")
        .select("id, bill_status, balance_due, total_amount, vendor_id")
        .eq("id", validated.billId)
        .eq("tenant_id", validated.tenantId)
        .eq("entity_id", validated.entityId)
        .eq("vendor_id", validated.vendorId)
        .single();

      if (be || !bill) return { success: false, message: "Bill not found for this vendor/entity." };
      if (bill.bill_status === "void" || bill.bill_status === "draft") {
        return { success: false, message: "Payments cannot be applied to void or draft bills." };
      }

      const balance = Number(bill.balance_due);
      const amountApplied = Math.min(validated.amountPaid, balance);
      const unapplied = Number((validated.amountPaid - amountApplied).toFixed(2));
      const paymentStatus = amountApplied > 0 ? "applied" : "recorded";
      const newBalance = Number((balance - amountApplied).toFixed(2));
      let nextStatus = bill.bill_status;
      if (newBalance <= 0 && amountApplied > 0) nextStatus = "paid";

      const { data: payRow, error: pe } = await admin
        .from("vendor_payments")
        .insert({
          tenant_id: validated.tenantId,
          entity_id: validated.entityId,
          vendor_id: validated.vendorId,
          bill_id: validated.billId,
          payment_reference: validated.paymentReference ?? null,
          payment_method: validated.paymentMethod,
          payment_date: validated.paymentDate,
          amount_paid: validated.amountPaid,
          amount_applied: amountApplied,
          unapplied_amount: unapplied,
          payment_status: paymentStatus,
          created_by: ctx.platformUserId,
        })
        .select("id")
        .single();

      if (pe) throw new Error(pe.message);

      const { error: ue } = await admin
        .from("bills")
        .update({
          balance_due: newBalance,
          bill_status: nextStatus,
        })
        .eq("id", validated.billId);

      if (ue) throw new Error(ue.message);

      await writeAuditLog({
        tenantId: validated.tenantId,
        entityId: validated.entityId,
        actorPlatformUserId: ctx.platformUserId,
        moduleKey: "ap",
        actionCode: "ap.payment.release",
        targetTable: "vendor_payments",
        targetRecordId: payRow.id,
        newValues: { amountApplied, billId: validated.billId },
      });

      return { success: true, message: "Vendor payment recorded.", data: { vendorPaymentId: payRow.id } };
    }

    const { data: payRow, error: pe } = await admin
      .from("vendor_payments")
      .insert({
        tenant_id: validated.tenantId,
        entity_id: validated.entityId,
        vendor_id: validated.vendorId,
        bill_id: null,
        payment_reference: validated.paymentReference ?? null,
        payment_method: validated.paymentMethod,
        payment_date: validated.paymentDate,
        amount_paid: validated.amountPaid,
        amount_applied: 0,
        unapplied_amount: validated.amountPaid,
        payment_status: "recorded",
        created_by: ctx.platformUserId,
      })
      .select("id")
      .single();

    if (pe) throw new Error(pe.message);

    await writeAuditLog({
      tenantId: validated.tenantId,
      entityId: validated.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "ap",
      actionCode: "ap.payment.release",
      targetTable: "vendor_payments",
      targetRecordId: payRow.id,
      newValues: { unapplied: validated.amountPaid },
    });

    return { success: true, message: "Vendor payment recorded (unapplied).", data: { vendorPaymentId: payRow.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}