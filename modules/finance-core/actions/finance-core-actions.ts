"use server";

import { createSupabaseAdminClient } from "@/lib/db/supabase-server";
import { resolveRequestContext } from "@/lib/context/resolve-request-context";
import { requirePermission, requireEntityScope } from "@/lib/permissions/require-permission";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { mapErrorToResult, type ActionResult } from "@/lib/errors/app-error";
import { z } from "zod";

// ── Schemas ───────────────────────────────────────────────────────────────────

const CreateEntitySchema = z.object({
  tenantId:     z.string().uuid(),
  entityCode:   z.string().min(1).max(20).toUpperCase(),
  legalName:    z.string().min(1).max(255),
  displayName:  z.string().min(1).max(255),
  entityType:   z.enum(["operating_company", "holding_company", "subsidiary", "branch_entity", "other"]),
  baseCurrency: z.string().length(3).default("USD"),
});

const CreateAccountSchema = z.object({
  tenantId:          z.string().uuid(),
  entityId:          z.string().uuid(),
  accountCategoryId: z.string().uuid(),
  code:              z.string().min(1).max(50),
  name:              z.string().min(1).max(255),
  accountType:       z.string().min(1),
  normalBalance:     z.enum(["debit", "credit"]),
  allowPosting:      z.boolean().default(true),
  parentAccountId:   z.string().uuid().optional(),
  description:       z.string().optional(),
});

const CreateFiscalPeriodSchema = z.object({
  tenantId:    z.string().uuid(),
  entityId:    z.string().uuid(),
  periodName:  z.string().min(1).max(100),
  startDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fiscalYear:  z.number().int().min(2000).max(2100),
  fiscalMonth: z.number().int().min(1).max(12).optional(),
});

const UpdateAccountSchema = z.object({
  tenantId:        z.string().uuid(),
  entityId:        z.string().uuid(),
  accountId:       z.string().uuid(),
  name:            z.string().min(1).max(255).optional(),
  description:     z.string().optional().nullable(),
  allowPosting:    z.boolean().optional(),
  isActive:        z.boolean().optional(),
  parentAccountId: z.string().uuid().optional().nullable(),
});

// ── Actions ───────────────────────────────────────────────────────────────────

/**
 * Create a new entity inside an existing tenant.
 * Permission: entity.create
 */
export async function createEntity(
  formData: FormData | Record<string, unknown>
): Promise<ActionResult<{ entityId: string }>> {
  try {
    const raw = formData instanceof FormData ? Object.fromEntries(formData) : formData;
    const input = CreateEntitySchema.parse(raw);
    const ctx = await resolveRequestContext(input.tenantId);
    requirePermission(ctx, "entity.create");

    const admin = createSupabaseAdminClient();

    // Check unique entity code within tenant
    const { data: existing } = await admin
      .from("entities")
      .select("id")
      .eq("tenant_id", input.tenantId)
      .eq("code", input.entityCode)
      .single();

    if (existing) {
      return {
        success: false,
        message: `Entity code ${input.entityCode} already exists in this tenant.`,
        errors: [{ code: "conflict", message: "entity_code_conflict" }],
      };
    }

    const { data: entity, error } = await admin
      .from("entities")
      .insert({
        tenant_id:     input.tenantId,
        code:          input.entityCode,
        legal_name:    input.legalName,
        display_name:  input.displayName,
        entity_type:   input.entityType,
        base_currency: input.baseCurrency,
        status:        "active",
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId:             input.tenantId,
      entityId:             entity.id,
      actorPlatformUserId:  ctx.platformUserId,
      moduleKey:            "finance_core",
      actionCode:           "entity.create",
      targetTable:          "entities",
      targetRecordId:       entity.id,
      newValues:            input,
    });

    return {
      success: true,
      message: `Entity ${input.entityCode} created successfully.`,
      data: { entityId: entity.id },
    };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

/**
 * Create a GL account for an entity.
 * Permission: gl.account.manage
 */
export async function createAccount(
  formData: FormData | Record<string, unknown>
): Promise<ActionResult<{ accountId: string }>> {
  try {
    const raw = formData instanceof FormData ? Object.fromEntries(formData) : formData;
    const input = CreateAccountSchema.parse(raw);
    const ctx = await resolveRequestContext(input.tenantId);
    requirePermission(ctx, "gl.account.manage");
    requireEntityScope(ctx, input.entityId);

    const admin = createSupabaseAdminClient();

    // Unique code per entity
    const { data: existing } = await admin
      .from("accounts")
      .select("id")
      .eq("entity_id", input.entityId)
      .eq("code", input.code)
      .single();

    if (existing) {
      return {
        success: false,
        message: `Account code ${input.code} already exists for this entity.`,
        errors: [{ code: "conflict", message: "account_code_conflict" }],
      };
    }

    const { data: account, error } = await admin
      .from("accounts")
      .insert({
        tenant_id:           input.tenantId,
        entity_id:           input.entityId,
        account_category_id: input.accountCategoryId,
        code:                input.code,
        name:                input.name,
        account_type:        input.accountType,
        normal_balance:      input.normalBalance,
        allow_posting:       input.allowPosting,
        parent_account_id:   input.parentAccountId ?? null,
        description:         input.description ?? null,
        is_active:           true,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId:            input.tenantId,
      entityId:            input.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey:           "finance_core",
      actionCode:          "gl.account.create",
      targetTable:         "accounts",
      targetRecordId:      account.id,
      newValues:           input,
    });

    return {
      success: true,
      message: `Account ${input.code} — ${input.name} created.`,
      data: { accountId: account.id },
    };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

/**
 * Create a fiscal period for an entity.
 * Permission: gl.period.close (reused as period management permission)
 */
export async function createFiscalPeriod(
  formData: FormData | Record<string, unknown>
): Promise<ActionResult<{ fiscalPeriodId: string }>> {
  try {
    const raw = formData instanceof FormData ? Object.fromEntries(formData) : formData;
    const input = CreateFiscalPeriodSchema.parse(raw);
    const ctx = await resolveRequestContext(input.tenantId);
    requirePermission(ctx, "gl.period.close");
    requireEntityScope(ctx, input.entityId);

    if (input.startDate >= input.endDate) {
      return {
        success: false,
        message: "Start date must be before end date.",
        errors: [{ code: "validation_failed", message: "invalid_date_range" }],
      };
    }

    const admin = createSupabaseAdminClient();

    const { data: period, error } = await admin
      .from("fiscal_periods")
      .insert({
        tenant_id:    input.tenantId,
        entity_id:    input.entityId,
        period_name:  input.periodName,
        start_date:   input.startDate,
        end_date:     input.endDate,
        fiscal_year:  input.fiscalYear,
        fiscal_month: input.fiscalMonth ?? null,
        status:       "open",
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return {
          success: false,
          message: "A fiscal period with overlapping dates already exists for this entity.",
          errors: [{ code: "conflict", message: "fiscal_period_overlap" }],
        };
      }
      throw new Error(error.message);
    }

    await writeAuditLog({
      tenantId:            input.tenantId,
      entityId:            input.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey:           "finance_core",
      actionCode:          "gl.period.create",
      targetTable:         "fiscal_periods",
      targetRecordId:      period.id,
      newValues:           input,
    });

    return {
      success: true,
      message: `Fiscal period ${input.periodName} created.`,
      data: { fiscalPeriodId: period.id },
    };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

/**
 * Close a fiscal period.
 * Permission: gl.period.close
 */
export async function closeFiscalPeriod(input: {
  tenantId: string;
  entityId: string;
  fiscalPeriodId: string;
  notes?: string;
}): Promise<ActionResult> {
  try {
    const ctx = await resolveRequestContext(input.tenantId);
    requirePermission(ctx, "gl.period.close");
    requireEntityScope(ctx, input.entityId);

    const admin = createSupabaseAdminClient();

    const { data: period } = await admin
      .from("fiscal_periods")
      .select("status, entity_id")
      .eq("id", input.fiscalPeriodId)
      .eq("tenant_id", input.tenantId)
      .eq("entity_id", input.entityId)
      .single();

    if (!period) return { success: false, message: "Fiscal period not found." };
    if (period.status === "closed") return { success: false, message: "Fiscal period is already closed." };
    if (period.status === "locked") return { success: false, message: "Fiscal period is locked and cannot be modified." };

    const now = new Date().toISOString();

    const { error: closureErr } = await admin.from("fiscal_period_closures").insert({
      tenant_id:         input.tenantId,
      entity_id:         input.entityId,
      fiscal_period_id:  input.fiscalPeriodId,
      closure_type:      "period_close",
      status:            "closed",
      closed_at:         now,
      closed_by:         ctx.platformUserId,
      notes:             input.notes ?? null,
    });

    if (closureErr) throw new Error(closureErr.message);

    const { error } = await admin
      .from("fiscal_periods")
      .update({ status: "closed", updated_at: now })
      .eq("id", input.fiscalPeriodId);

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId:            input.tenantId,
      entityId:            input.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey:           "finance_core",
      actionCode:          "gl.period.close",
      targetTable:         "fiscal_periods",
      targetRecordId:      input.fiscalPeriodId,
      oldValues:           { status: period.status },
      newValues:           { status: "closed" },
    });

    return { success: true, message: "Fiscal period closed." };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

/**
 * Update GL account fields. Permission: gl.account.manage
 */
export async function updateAccount(
  input: z.infer<typeof UpdateAccountSchema>
): Promise<ActionResult> {
  try {
    const parsed = UpdateAccountSchema.parse(input);
    const ctx = await resolveRequestContext(parsed.tenantId);
    requirePermission(ctx, "gl.account.manage");
    requireEntityScope(ctx, parsed.entityId);

    if (
      parsed.name === undefined &&
      parsed.description === undefined &&
      parsed.allowPosting === undefined &&
      parsed.isActive === undefined &&
      parsed.parentAccountId === undefined
    ) {
      return { success: false, message: "No fields to update." };
    }

    const admin = createSupabaseAdminClient();

    const { data: row } = await admin
      .from("accounts")
      .select("id, name, description, allow_posting, is_active, parent_account_id")
      .eq("id", parsed.accountId)
      .eq("tenant_id", parsed.tenantId)
      .eq("entity_id", parsed.entityId)
      .single();

    if (!row) return { success: false, message: "Account not found." };

    if (parsed.parentAccountId) {
      const { data: parent } = await admin
        .from("accounts")
        .select("id")
        .eq("id", parsed.parentAccountId)
        .eq("entity_id", parsed.entityId)
        .single();
      if (!parent) {
        return {
          success: false,
          message: "Parent account must belong to the same entity.",
          errors: [{ code: "validation_failed", message: "invalid_parent_account" }],
        };
      }
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (parsed.name !== undefined) patch.name = parsed.name;
    if (parsed.description !== undefined) patch.description = parsed.description;
    if (parsed.allowPosting !== undefined) patch.allow_posting = parsed.allowPosting;
    if (parsed.isActive !== undefined) patch.is_active = parsed.isActive;
    if (parsed.parentAccountId !== undefined) patch.parent_account_id = parsed.parentAccountId;

    const { error } = await admin.from("accounts").update(patch).eq("id", parsed.accountId);
    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId:            parsed.tenantId,
      entityId:            parsed.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey:           "finance_core",
      actionCode:          "gl.account.update",
      targetTable:         "accounts",
      targetRecordId:      parsed.accountId,
      oldValues:           row,
      newValues:           patch,
    });

    return { success: true, message: "Account updated." };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

/**
 * Deactivate an account (soft archive). Permission: gl.account.manage
 */
export async function archiveAccount(input: {
  tenantId: string;
  entityId: string;
  accountId: string;
}): Promise<ActionResult> {
  try {
    const ctx = await resolveRequestContext(input.tenantId);
    requirePermission(ctx, "gl.account.manage");
    requireEntityScope(ctx, input.entityId);

    const admin = createSupabaseAdminClient();
    const { data: row } = await admin
      .from("accounts")
      .select("is_active, code")
      .eq("id", input.accountId)
      .eq("tenant_id", input.tenantId)
      .eq("entity_id", input.entityId)
      .single();

    if (!row) return { success: false, message: "Account not found." };
    if (!row.is_active) return { success: false, message: "Account is already inactive." };

    const now = new Date().toISOString();
    const { error } = await admin
      .from("accounts")
      .update({ is_active: false, updated_at: now })
      .eq("id", input.accountId);

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId:            input.tenantId,
      entityId:            input.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey:           "finance_core",
      actionCode:          "gl.account.archive",
      targetTable:         "accounts",
      targetRecordId:      input.accountId,
      oldValues:           { is_active: true },
      newValues:           { is_active: false },
    });

    return { success: true, message: `Account ${row.code} archived.` };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

/**
 * Reopen a closed fiscal period. Permission: gl.period.reopen
 */
export async function reopenFiscalPeriod(input: {
  tenantId: string;
  entityId: string;
  fiscalPeriodId: string;
  reopenReason: string;
}): Promise<ActionResult> {
  try {
    if (!input.reopenReason?.trim()) {
      return { success: false, message: "A reopen reason is required." };
    }

    const ctx = await resolveRequestContext(input.tenantId);
    requirePermission(ctx, "gl.period.reopen");
    requireEntityScope(ctx, input.entityId);

    const admin = createSupabaseAdminClient();

    const { data: period } = await admin
      .from("fiscal_periods")
      .select("status")
      .eq("id", input.fiscalPeriodId)
      .eq("tenant_id", input.tenantId)
      .eq("entity_id", input.entityId)
      .single();

    if (!period) return { success: false, message: "Fiscal period not found." };
    if (period.status !== "closed") {
      return { success: false, message: "Only a closed fiscal period can be reopened." };
    }

    const now = new Date().toISOString();

    const { data: openClosure } = await admin
      .from("fiscal_period_closures")
      .select("id")
      .eq("fiscal_period_id", input.fiscalPeriodId)
      .is("reopened_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (openClosure) {
      await admin
        .from("fiscal_period_closures")
        .update({
          reopened_at:  now,
          reopened_by:  ctx.platformUserId,
          notes:        input.reopenReason.trim(),
          updated_at:   now,
        })
        .eq("id", openClosure.id);
    }

    const { error } = await admin
      .from("fiscal_periods")
      .update({ status: "open", updated_at: now })
      .eq("id", input.fiscalPeriodId);

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId:            input.tenantId,
      entityId:            input.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey:           "finance_core",
      actionCode:          "gl.period.reopen",
      targetTable:         "fiscal_periods",
      targetRecordId:      input.fiscalPeriodId,
      oldValues:           { status: "closed" },
      newValues:           { status: "open", reason: input.reopenReason.trim() },
    });

    return { success: true, message: "Fiscal period reopened." };
  } catch (err) {
    return mapErrorToResult(err);
  }
}
