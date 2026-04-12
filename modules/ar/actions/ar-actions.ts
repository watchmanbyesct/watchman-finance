"use server";

import { createSupabaseAdminClient } from "@/lib/db/supabase-server";
import { resolveRequestContext } from "@/lib/context/resolve-request-context";
import { requirePermission, requireEntityScope, requireModuleEntitlement } from "@/lib/permissions/require-permission";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { mapErrorToResult, type ActionResult } from "@/lib/errors/app-error";
import { z } from "zod";

const InvoiceLineSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  revenueAccountId: z.string().uuid(),
  lineType: z.enum(["service", "product", "fee", "discount", "tax", "adjustment"]).default("service"),
  metadataJson: z.record(z.unknown()).optional(),
});

const CreateInvoiceDraftSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid(),
  customerId: z.string().uuid(),
  customerSiteId: z.string().uuid().optional(),
  invoiceNumber: z.string().min(1).max(50),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  currencyCode: z.string().length(3).default("USD"),
  memo: z.string().optional(),
  sourceType: z.enum(["manual", "contract_billing", "service_event", "other"]).default("manual"),
  lines: z.array(InvoiceLineSchema).min(1),
});

async function refreshInvoiceTotals(admin: ReturnType<typeof createSupabaseAdminClient>, invoiceId: string) {
  const { data: lines, error: le } = await admin
    .from("invoice_lines")
    .select("line_amount")
    .eq("invoice_id", invoiceId);
  if (le) throw new Error(le.message);
  const subtotal = (lines ?? []).reduce((s: number, r: { line_amount: string | number }) => s + Number(r.line_amount), 0);
  const tax = 0;
  const total = subtotal + tax;
  const { data: inv, error: ie } = await admin
    .from("invoices")
    .select("invoice_status, balance_due, total_amount")
    .eq("id", invoiceId)
    .single();
  if (ie || !inv) throw new Error(ie?.message ?? "not_found:invoice");
  if (inv.invoice_status === "void") {
    const { error: ue } = await admin
      .from("invoices")
      .update({ subtotal_amount: subtotal, tax_amount: tax, total_amount: total })
      .eq("id", invoiceId);
    if (ue) throw new Error(ue.message);
    return;
  }
  const paidPortion = Math.max(0, Number(inv.total_amount) - Number(inv.balance_due));
  const nextBalance = Math.max(0, Number((total - paidPortion).toFixed(2)));
  const { error: ue } = await admin
    .from("invoices")
    .update({
      subtotal_amount: subtotal,
      tax_amount: tax,
      total_amount: total,
      balance_due: nextBalance,
    })
    .eq("id", invoiceId);
  if (ue) throw new Error(ue.message);
}

/**
 * Create an invoice draft with lines (Pack 003 schema).
 * Permission: ar.invoice.create
 */
export async function createInvoiceDraft(
  input: z.infer<typeof CreateInvoiceDraftSchema>
): Promise<ActionResult<{ invoiceId: string }>> {
  try {
    const validated = CreateInvoiceDraftSchema.parse(input);
    const ctx = await resolveRequestContext(validated.tenantId);
    requireModuleEntitlement(ctx, "ar");
    requirePermission(ctx, "ar.invoice.create");
    requireEntityScope(ctx, validated.entityId);

    const admin = createSupabaseAdminClient();

    const { data: existing } = await admin
      .from("invoices")
      .select("id")
      .eq("entity_id", validated.entityId)
      .eq("invoice_number", validated.invoiceNumber)
      .maybeSingle();

    if (existing) {
      return {
        success: false,
        message: `Invoice number ${validated.invoiceNumber} already exists for this entity.`,
        errors: [{ code: "conflict", message: "invoice_number_conflict" }],
      };
    }

    const { data: invoice, error: invError } = await admin
      .from("invoices")
      .insert({
        tenant_id: validated.tenantId,
        entity_id: validated.entityId,
        customer_id: validated.customerId,
        customer_site_id: validated.customerSiteId ?? null,
        invoice_number: validated.invoiceNumber,
        invoice_status: "draft",
        issue_date: validated.issueDate ?? null,
        due_date: validated.dueDate ?? null,
        currency_code: validated.currencyCode,
        memo: validated.memo ?? null,
        source_type: validated.sourceType,
        created_by: ctx.platformUserId,
        subtotal_amount: 0,
        tax_amount: 0,
        total_amount: 0,
        balance_due: 0,
      })
      .select("id")
      .single();

    if (invError) throw new Error(invError.message);

    const lineRows = validated.lines.map((line, idx) => {
      const lineAmount = Number((line.quantity * line.unitPrice).toFixed(2));
      return {
        tenant_id: validated.tenantId,
        invoice_id: invoice.id,
        line_number: idx + 1,
        line_type: line.lineType,
        description: line.description,
        quantity: line.quantity,
        unit_price: line.unitPrice,
        line_amount: lineAmount,
        revenue_account_id: line.revenueAccountId,
        metadata_json: line.metadataJson ?? {},
      };
    });

    const { error: lineError } = await admin.from("invoice_lines").insert(lineRows);
    if (lineError) throw new Error(lineError.message);

    await refreshInvoiceTotals(admin, invoice.id);

    await writeAuditLog({
      tenantId: validated.tenantId,
      entityId: validated.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "ar",
      actionCode: "ar.invoice.create",
      targetTable: "invoices",
      targetRecordId: invoice.id,
      newValues: { invoiceNumber: validated.invoiceNumber, customerId: validated.customerId },
    });

    return {
      success: true,
      message: `Invoice ${validated.invoiceNumber} created as draft.`,
      data: { invoiceId: invoice.id },
    };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const AddInvoiceLineSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid(),
  invoiceId: z.string().uuid(),
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  revenueAccountId: z.string().uuid(),
  lineType: z.enum(["service", "product", "fee", "discount", "tax", "adjustment"]).default("service"),
  metadataJson: z.record(z.unknown()).optional(),
});

/** Permission: ar.invoice.create */
export async function addInvoiceLine(
  input: z.infer<typeof AddInvoiceLineSchema>
): Promise<ActionResult<{ invoiceLineId: string }>> {
  try {
    const validated = AddInvoiceLineSchema.parse(input);
    const ctx = await resolveRequestContext(validated.tenantId);
    requireModuleEntitlement(ctx, "ar");
    requirePermission(ctx, "ar.invoice.create");
    requireEntityScope(ctx, validated.entityId);

    const admin = createSupabaseAdminClient();

    const { data: inv, error: invErr } = await admin
      .from("invoices")
      .select("invoice_status, entity_id")
      .eq("id", validated.invoiceId)
      .eq("tenant_id", validated.tenantId)
      .single();

    if (invErr || !inv) return { success: false, message: "Invoice not found." };
    if (inv.entity_id !== validated.entityId) {
      return { success: false, message: "Invoice entity mismatch." };
    }
    if (inv.invoice_status !== "draft") {
      return { success: false, message: "Lines can only be added while the invoice is a draft." };
    }

    const { data: maxRow } = await admin
      .from("invoice_lines")
      .select("line_number")
      .eq("invoice_id", validated.invoiceId)
      .order("line_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const lineNumber = (maxRow?.line_number ?? 0) + 1;
    const lineAmount = Number((validated.quantity * validated.unitPrice).toFixed(2));

    const { data: line, error: lineErr } = await admin
      .from("invoice_lines")
      .insert({
        tenant_id: validated.tenantId,
        invoice_id: validated.invoiceId,
        line_number: lineNumber,
        line_type: validated.lineType,
        description: validated.description,
        quantity: validated.quantity,
        unit_price: validated.unitPrice,
        line_amount: lineAmount,
        revenue_account_id: validated.revenueAccountId,
        metadata_json: validated.metadataJson ?? {},
      })
      .select("id")
      .single();

    if (lineErr) throw new Error(lineErr.message);

    await refreshInvoiceTotals(admin, validated.invoiceId);

    await writeAuditLog({
      tenantId: validated.tenantId,
      entityId: validated.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "ar",
      actionCode: "ar.invoice.line.add",
      targetTable: "invoice_lines",
      targetRecordId: line.id,
      newValues: { invoiceId: validated.invoiceId, lineNumber },
    });

    return { success: true, message: "Line added.", data: { invoiceLineId: line.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

/** Permission: ar.invoice.issue */
export async function issueInvoice(input: {
  tenantId: string;
  entityId: string;
  invoiceId: string;
  issueDate?: string;
  dueDate?: string;
}): Promise<ActionResult> {
  try {
    const ctx = await resolveRequestContext(input.tenantId);
    requireModuleEntitlement(ctx, "ar");
    requirePermission(ctx, "ar.invoice.issue");
    requireEntityScope(ctx, input.entityId);

    const admin = createSupabaseAdminClient();

    const { data: invoice, error: fe } = await admin
      .from("invoices")
      .select("invoice_status, invoice_number, issue_date, due_date, total_amount, balance_due")
      .eq("id", input.invoiceId)
      .eq("tenant_id", input.tenantId)
      .eq("entity_id", input.entityId)
      .single();

    if (fe || !invoice) return { success: false, message: "Invoice not found." };
    if (invoice.invoice_status !== "draft") {
      return {
        success: false,
        message: `Invoice is in status '${invoice.invoice_status}' and cannot be issued.`,
      };
    }

    const issueDate = input.issueDate ?? invoice.issue_date ?? new Date().toISOString().slice(0, 10);
    const dueDate = input.dueDate ?? invoice.due_date ?? issueDate;

    const { error } = await admin
      .from("invoices")
      .update({
        invoice_status: "issued",
        issue_date: issueDate,
        due_date: dueDate,
        issued_by: ctx.platformUserId,
        issued_at: new Date().toISOString(),
        balance_due: Number(invoice.total_amount),
      })
      .eq("id", input.invoiceId);

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: input.tenantId,
      entityId: input.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "ar",
      actionCode: "ar.invoice.issue",
      targetTable: "invoices",
      targetRecordId: input.invoiceId,
      oldValues: { invoice_status: "draft" },
      newValues: { invoice_status: "issued", issueDate, dueDate },
    });

    return { success: true, message: `Invoice ${invoice.invoice_number} issued.` };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

/** Permission: ar.invoice.void */
export async function voidInvoice(input: {
  tenantId: string;
  entityId: string;
  invoiceId: string;
  reason: string;
}): Promise<ActionResult> {
  try {
    if (!input.reason?.trim()) {
      return { success: false, message: "A void reason is required.", errors: [{ code: "validation_failed", message: "reason_required" }] };
    }
    const ctx = await resolveRequestContext(input.tenantId);
    requireModuleEntitlement(ctx, "ar");
    requirePermission(ctx, "ar.invoice.void");
    requireEntityScope(ctx, input.entityId);

    const admin = createSupabaseAdminClient();

    const { data: invoice, error: fe } = await admin
      .from("invoices")
      .select("invoice_status, invoice_number")
      .eq("id", input.invoiceId)
      .eq("tenant_id", input.tenantId)
      .eq("entity_id", input.entityId)
      .single();

    if (fe || !invoice) return { success: false, message: "Invoice not found." };
    if (invoice.invoice_status === "void") return { success: false, message: "Invoice is already void." };

    const { data: payments } = await admin
      .from("invoice_payments")
      .select("amount_applied")
      .eq("invoice_id", input.invoiceId);

    const applied = (payments ?? []).reduce(
      (s: number, p: { amount_applied: string | number }) => s + Number(p.amount_applied),
      0
    );
    if (applied > 0) {
      return {
        success: false,
        message: "Cannot void an invoice with payments applied. Reverse the payments first.",
        errors: [{ code: "workflow_violation", message: "payments_applied" }],
      };
    }

    const { error } = await admin
      .from("invoices")
      .update({
        invoice_status: "void",
        voided_by: ctx.platformUserId,
        voided_at: new Date().toISOString(),
      })
      .eq("id", input.invoiceId);

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: input.tenantId,
      entityId: input.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "ar",
      actionCode: "ar.invoice.void",
      targetTable: "invoices",
      targetRecordId: input.invoiceId,
      oldValues: { invoice_status: invoice.invoice_status },
      newValues: { invoice_status: "void", reason: input.reason },
    });

    return { success: true, message: `Invoice ${invoice.invoice_number} voided.` };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const CreateCustomerSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid().optional(),
  customerCode: z.string().min(1).max(80),
  legalName: z.string().min(1),
  displayName: z.string().min(1),
  billingEmail: z.string().email().optional(),
  billingPhone: z.string().optional(),
  paymentTermsDays: z.number().int().min(0).max(365).default(30),
});

/** Permission: ar.invoice.create (customer master data for AR) */
export async function createCustomer(
  input: z.infer<typeof CreateCustomerSchema>
): Promise<ActionResult<{ customerId: string }>> {
  try {
    const validated = CreateCustomerSchema.parse(input);
    const ctx = await resolveRequestContext(validated.tenantId);
    requireModuleEntitlement(ctx, "ar");
    requirePermission(ctx, "ar.invoice.create");
    if (validated.entityId) requireEntityScope(ctx, validated.entityId);

    const admin = createSupabaseAdminClient();

    const { data: row, error } = await admin
      .from("customers")
      .insert({
        tenant_id: validated.tenantId,
        entity_id: validated.entityId ?? null,
        customer_code: validated.customerCode,
        legal_name: validated.legalName,
        display_name: validated.displayName,
        billing_email: validated.billingEmail ?? null,
        billing_phone: validated.billingPhone ?? null,
        payment_terms_days: validated.paymentTermsDays,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: validated.tenantId,
      entityId: validated.entityId ?? null,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "ar",
      actionCode: "ar.customer.create",
      targetTable: "customers",
      targetRecordId: row.id,
      newValues: { customerCode: validated.customerCode },
    });

    return { success: true, message: "Customer created.", data: { customerId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const CreateCustomerSiteSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid().optional(),
  customerId: z.string().uuid(),
  siteCode: z.string().min(1).max(80),
  siteName: z.string().min(1),
  addressJson: z.record(z.unknown()).optional(),
});

/** Permission: ar.invoice.create */
export async function createCustomerSite(
  input: z.infer<typeof CreateCustomerSiteSchema>
): Promise<ActionResult<{ customerSiteId: string }>> {
  try {
    const validated = CreateCustomerSiteSchema.parse(input);
    const ctx = await resolveRequestContext(validated.tenantId);
    requireModuleEntitlement(ctx, "ar");
    requirePermission(ctx, "ar.invoice.create");
    if (validated.entityId) requireEntityScope(ctx, validated.entityId);

    const admin = createSupabaseAdminClient();

    const { data: row, error } = await admin
      .from("customer_sites")
      .insert({
        tenant_id: validated.tenantId,
        entity_id: validated.entityId ?? null,
        customer_id: validated.customerId,
        site_code: validated.siteCode,
        site_name: validated.siteName,
        address_json: validated.addressJson ?? {},
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: validated.tenantId,
      entityId: validated.entityId ?? null,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "ar",
      actionCode: "ar.customer_site.create",
      targetTable: "customer_sites",
      targetRecordId: row.id,
      newValues: { customerId: validated.customerId, siteCode: validated.siteCode },
    });

    return { success: true, message: "Site created.", data: { customerSiteId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const RecordInvoicePaymentSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid(),
  customerId: z.string().uuid(),
  invoiceId: z.string().uuid().optional(),
  paymentReference: z.string().optional(),
  paymentMethod: z.enum(["manual", "ach", "card", "check", "other"]),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amountReceived: z.number().positive(),
});

/**
 * Record a customer payment; when invoiceId is set, applies up to the open balance.
 * Permission: ar.payment.apply
 */
export async function recordInvoicePayment(
  input: z.infer<typeof RecordInvoicePaymentSchema>
): Promise<ActionResult<{ paymentId: string }>> {
  try {
    const validated = RecordInvoicePaymentSchema.parse(input);
    const ctx = await resolveRequestContext(validated.tenantId);
    requireModuleEntitlement(ctx, "ar");
    requirePermission(ctx, "ar.payment.apply");
    requireEntityScope(ctx, validated.entityId);

    const admin = createSupabaseAdminClient();

    let amountApplied = 0;
    let unapplied = validated.amountReceived;
    let paymentStatus: "recorded" | "applied" = "recorded";

    if (validated.invoiceId) {
      const { data: inv, error: ie } = await admin
        .from("invoices")
        .select("id, invoice_status, balance_due, total_amount")
        .eq("id", validated.invoiceId)
        .eq("tenant_id", validated.tenantId)
        .eq("entity_id", validated.entityId)
        .eq("customer_id", validated.customerId)
        .single();

      if (ie || !inv) return { success: false, message: "Invoice not found for this customer/entity." };
      if (inv.invoice_status === "void" || inv.invoice_status === "draft") {
        return { success: false, message: "Payments cannot be applied to void or draft invoices." };
      }

      const balance = Number(inv.balance_due);
      amountApplied = Math.min(validated.amountReceived, balance);
      unapplied = Number((validated.amountReceived - amountApplied).toFixed(2));
      paymentStatus = amountApplied > 0 ? "applied" : "recorded";

      const newBalance = Number((balance - amountApplied).toFixed(2));
      let nextStatus = inv.invoice_status;
      if (newBalance <= 0 && amountApplied > 0) nextStatus = "paid";
      else if (amountApplied > 0 && newBalance > 0) nextStatus = "partially_paid";

      const { data: payRow, error: pe } = await admin
        .from("invoice_payments")
        .insert({
          tenant_id: validated.tenantId,
          entity_id: validated.entityId,
          customer_id: validated.customerId,
          invoice_id: validated.invoiceId,
          payment_reference: validated.paymentReference ?? null,
          payment_method: validated.paymentMethod,
          payment_date: validated.paymentDate,
          amount_received: validated.amountReceived,
          amount_applied: amountApplied,
          unapplied_amount: unapplied,
          payment_status: paymentStatus,
          created_by: ctx.platformUserId,
        })
        .select("id")
        .single();

      if (pe) throw new Error(pe.message);

      const { error: ue } = await admin
        .from("invoices")
        .update({
          balance_due: newBalance,
          invoice_status: nextStatus,
        })
        .eq("id", validated.invoiceId);

      if (ue) throw new Error(ue.message);

      await writeAuditLog({
        tenantId: validated.tenantId,
        entityId: validated.entityId,
        actorPlatformUserId: ctx.platformUserId,
        moduleKey: "ar",
        actionCode: "ar.payment.apply",
        targetTable: "invoice_payments",
        targetRecordId: payRow.id,
        newValues: { amountApplied, invoiceId: validated.invoiceId },
      });

      return { success: true, message: "Payment recorded.", data: { paymentId: payRow.id } };
    }

    const { data: payRow, error: pe } = await admin
      .from("invoice_payments")
      .insert({
        tenant_id: validated.tenantId,
        entity_id: validated.entityId,
        customer_id: validated.customerId,
        invoice_id: null,
        payment_reference: validated.paymentReference ?? null,
        payment_method: validated.paymentMethod,
        payment_date: validated.paymentDate,
        amount_received: validated.amountReceived,
        amount_applied: 0,
        unapplied_amount: unapplied,
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
      moduleKey: "ar",
      actionCode: "ar.payment.apply",
      targetTable: "invoice_payments",
      targetRecordId: payRow.id,
      newValues: { unapplied },
    });

    return { success: true, message: "Payment recorded (unapplied).", data: { paymentId: payRow.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}
