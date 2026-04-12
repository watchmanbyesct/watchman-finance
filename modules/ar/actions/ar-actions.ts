"use server";

import { createSupabaseAdminClient } from "@/lib/db/supabase-server";
import { resolveRequestContext } from "@/lib/context/resolve-request-context";
import { requirePermission, requireEntityScope, requireModuleEntitlement } from "@/lib/permissions/require-permission";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { mapErrorToResult, type ActionResult } from "@/lib/errors/app-error";
import { z } from "zod";

const InvoiceLineSchema = z.object({
  description:   z.string().min(1),
  quantity:      z.number().positive(),
  unitPrice:     z.number().min(0),
  accountId:     z.string().uuid(),
  catalogItemId: z.string().uuid().optional(),
  taxable:       z.boolean().default(false),
});

const CreateInvoiceDraftSchema = z.object({
  tenantId:       z.string().uuid(),
  entityId:       z.string().uuid(),
  customerId:     z.string().uuid(),
  customerSiteId: z.string().uuid().optional(),
  invoiceNumber:  z.string().min(1).max(50),
  invoiceDate:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fiscalPeriodId: z.string().uuid(),
  currency:       z.string().length(3).default("USD"),
  memo:           z.string().optional(),
  lines:          z.array(InvoiceLineSchema).min(1),
});

/**
 * Create an invoice draft with lines.
 * Permission: ar.invoice.create
 * Module: ar
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

    // Check invoice number uniqueness per entity
    const { data: existing } = await admin
      .from("invoices")
      .select("id")
      .eq("entity_id", validated.entityId)
      .eq("invoice_number", validated.invoiceNumber)
      .single();

    if (existing) {
      return {
        success: false,
        message: `Invoice number ${validated.invoiceNumber} already exists for this entity.`,
        errors: [{ code: "conflict", message: "invoice_number_conflict" }],
      };
    }

    // Calculate totals
    const totalAmount = validated.lines.reduce(
      (sum, line) => sum + line.quantity * line.unitPrice,
      0
    );

    // Insert invoice
    const { data: invoice, error: invError } = await admin
      .from("invoices")
      .insert({
        tenant_id:        validated.tenantId,
        entity_id:        validated.entityId,
        customer_id:      validated.customerId,
        customer_site_id: validated.customerSiteId ?? null,
        invoice_number:   validated.invoiceNumber,
        invoice_date:     validated.invoiceDate,
        due_date:         validated.dueDate,
        fiscal_period_id: validated.fiscalPeriodId,
        currency:         validated.currency,
        memo:             validated.memo ?? null,
        status:           "draft",
        total_amount:     totalAmount,
        amount_paid:      0,
        balance_due:      totalAmount,
      })
      .select("id")
      .single();

    if (invError) throw new Error(invError.message);

    // Insert lines
    const lineRows = validated.lines.map((line, idx) => ({
      tenant_id:      validated.tenantId,
      entity_id:      validated.entityId,
      invoice_id:     invoice.id,
      line_number:    idx + 1,
      description:    line.description,
      quantity:       line.quantity,
      unit_price:     line.unitPrice,
      line_amount:    line.quantity * line.unitPrice,
      account_id:     line.accountId,
      catalog_item_id: line.catalogItemId ?? null,
      taxable:        line.taxable,
    }));

    const { error: lineError } = await admin.from("invoice_lines").insert(lineRows);
    if (lineError) throw new Error(lineError.message);

    await writeAuditLog({
      tenantId:            validated.tenantId,
      entityId:            validated.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey:           "ar",
      actionCode:          "ar.invoice.create_draft",
      targetTable:         "invoices",
      targetRecordId:      invoice.id,
      newValues:           { invoiceNumber: validated.invoiceNumber, totalAmount, customerId: validated.customerId },
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

/**
 * Issue a draft invoice (status: draft -> issued).
 * Permission: ar.invoice.issue
 */
export async function issueInvoice(input: {
  tenantId: string;
  entityId: string;
  invoiceId: string;
}): Promise<ActionResult> {
  try {
    const ctx = await resolveRequestContext(input.tenantId);
    requireModuleEntitlement(ctx, "ar");
    requirePermission(ctx, "ar.invoice.issue");
    requireEntityScope(ctx, input.entityId);

    const admin = createSupabaseAdminClient();

    const { data: invoice } = await admin
      .from("invoices")
      .select("status, invoice_number")
      .eq("id", input.invoiceId)
      .eq("tenant_id", input.tenantId)
      .single();

    if (!invoice) return { success: false, message: "Invoice not found." };
    if (invoice.status !== "draft") {
      return { success: false, message: `Invoice is in status '${invoice.status}' and cannot be issued.` };
    }

    const { error } = await admin
      .from("invoices")
      .update({ status: "issued", issued_at: new Date().toISOString() })
      .eq("id", input.invoiceId);

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId:            input.tenantId,
      entityId:            input.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey:           "ar",
      actionCode:          "ar.invoice.issue",
      targetTable:         "invoices",
      targetRecordId:      input.invoiceId,
      oldValues:           { status: "draft" },
      newValues:           { status: "issued" },
    });

    return { success: true, message: `Invoice ${invoice.invoice_number} issued.` };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

/**
 * Void an invoice. Cannot void if payments have been applied.
 * Permission: ar.invoice.void
 */
export async function voidInvoice(input: {
  tenantId: string;
  entityId: string;
  invoiceId: string;
  reason: string;
}): Promise<ActionResult> {
  try {
    const ctx = await resolveRequestContext(input.tenantId);
    requireModuleEntitlement(ctx, "ar");
    requirePermission(ctx, "ar.invoice.void");
    requireEntityScope(ctx, input.entityId);

    const admin = createSupabaseAdminClient();

    const { data: invoice } = await admin
      .from("invoices")
      .select("status, amount_paid, invoice_number")
      .eq("id", input.invoiceId)
      .eq("tenant_id", input.tenantId)
      .single();

    if (!invoice) return { success: false, message: "Invoice not found." };
    if (invoice.status === "voided") return { success: false, message: "Invoice is already voided." };
    if (invoice.amount_paid > 0) {
      return {
        success: false,
        message: "Cannot void an invoice with payments applied. Reverse the payments first.",
        errors: [{ code: "workflow_violation", message: "payments_applied" }],
      };
    }

    const { error } = await admin
      .from("invoices")
      .update({ status: "voided", voided_at: new Date().toISOString(), void_reason: input.reason })
      .eq("id", input.invoiceId);

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId:            input.tenantId,
      entityId:            input.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey:           "ar",
      actionCode:          "ar.invoice.void",
      targetTable:         "invoices",
      targetRecordId:      input.invoiceId,
      oldValues:           { status: invoice.status },
      newValues:           { status: "voided", reason: input.reason },
    });

    return { success: true, message: `Invoice ${invoice.invoice_number} voided.` };
  } catch (err) {
    return mapErrorToResult(err);
  }
}
