/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

"use server";

import { createSupabaseAdminClient } from "@/lib/db/supabase-server";
import { resolveRequestContext } from "@/lib/context/resolve-request-context";
import { requirePermission, requireEntityScope, requireModuleEntitlement } from "@/lib/permissions/require-permission";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { mapErrorToResult, type ActionResult } from "@/lib/errors/app-error";
import { z } from "zod";

const CreateTaxJurisdictionSchema = z.object({
  tenantId: z.string().uuid(),
  jurisdictionCode: z.string().min(1).max(32),
  jurisdictionName: z.string().min(1).max(255),
  countryCode: z.string().length(2).default("US"),
});

export async function createTaxJurisdiction(
  input: z.infer<typeof CreateTaxJurisdictionSchema>
): Promise<ActionResult<{ taxJurisdictionId: string }>> {
  try {
    const v = CreateTaxJurisdictionSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "tax");
    requirePermission(ctx, "tax.profile.manage");

    const admin = createSupabaseAdminClient();
    const { data: row, error } = await admin
      .from("tax_jurisdictions")
      .insert({
        tenant_id: v.tenantId,
        jurisdiction_code: v.jurisdictionCode,
        jurisdiction_name: v.jurisdictionName,
        country_code: v.countryCode,
        status: "active",
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: null,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "tax",
      actionCode: "tax.jurisdiction.create",
      targetTable: "tax_jurisdictions",
      targetRecordId: row.id,
      newValues: { jurisdictionCode: v.jurisdictionCode },
    });

    return { success: true, message: "Tax jurisdiction created.", data: { taxJurisdictionId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const CreateTaxEmployerProfileSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid(),
  taxJurisdictionId: z.string().uuid(),
  registrationReference: z.string().max(255).optional(),
  profileStatus: z.enum(["draft", "active", "inactive"]).default("draft"),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(2000).optional(),
});

export async function createTaxEmployerProfile(
  input: z.infer<typeof CreateTaxEmployerProfileSchema>
): Promise<ActionResult<{ taxEmployerProfileId: string }>> {
  try {
    const v = CreateTaxEmployerProfileSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "tax");
    requirePermission(ctx, "tax.profile.manage");
    requireEntityScope(ctx, v.entityId);

    const admin = createSupabaseAdminClient();
    const { data: jur, error: je } = await admin
      .from("tax_jurisdictions")
      .select("id")
      .eq("id", v.taxJurisdictionId)
      .eq("tenant_id", v.tenantId)
      .single();
    if (je || !jur) return { success: false, message: "Tax jurisdiction not found." };

    const { data: row, error } = await admin
      .from("tax_employer_profiles")
      .insert({
        tenant_id: v.tenantId,
        entity_id: v.entityId,
        tax_jurisdiction_id: v.taxJurisdictionId,
        registration_reference: v.registrationReference ?? null,
        profile_status: v.profileStatus,
        effective_date: v.effectiveDate ?? null,
        notes: v.notes ?? null,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: v.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "tax",
      actionCode: "tax.employer_profile.create",
      targetTable: "tax_employer_profiles",
      targetRecordId: row.id,
      newValues: { taxJurisdictionId: v.taxJurisdictionId },
    });

    return { success: true, message: "Employer tax profile saved.", data: { taxEmployerProfileId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const CreateTaxLiabilitySchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid(),
  taxJurisdictionId: z.string().uuid().optional(),
  liabilityCode: z.string().min(1).max(64),
  description: z.string().max(500).optional(),
  amount: z.number(),
  asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function createTaxLiability(
  input: z.infer<typeof CreateTaxLiabilitySchema>
): Promise<ActionResult<{ taxLiabilityId: string }>> {
  try {
    const v = CreateTaxLiabilitySchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "tax");
    requirePermission(ctx, "tax.liability.record");
    requireEntityScope(ctx, v.entityId);

    const admin = createSupabaseAdminClient();
    if (v.taxJurisdictionId) {
      const { data: jur, error: je } = await admin
        .from("tax_jurisdictions")
        .select("id")
        .eq("id", v.taxJurisdictionId)
        .eq("tenant_id", v.tenantId)
        .single();
      if (je || !jur) return { success: false, message: "Tax jurisdiction not found." };
    }

    const { data: row, error } = await admin
      .from("tax_liabilities")
      .insert({
        tenant_id: v.tenantId,
        entity_id: v.entityId,
        tax_jurisdiction_id: v.taxJurisdictionId ?? null,
        liability_code: v.liabilityCode,
        description: v.description ?? null,
        amount: Number(v.amount.toFixed(2)),
        as_of_date: v.asOfDate,
        liability_status: "open",
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: v.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "tax",
      actionCode: "tax.liability.create",
      targetTable: "tax_liabilities",
      targetRecordId: row.id,
      newValues: { liabilityCode: v.liabilityCode, amount: v.amount },
    });

    return { success: true, message: "Tax liability recorded.", data: { taxLiabilityId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const CreateTaxFilingPeriodSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid(),
  taxJurisdictionId: z.string().uuid(),
  periodCode: z.string().min(1).max(32),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  filingDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function createTaxFilingPeriod(
  input: z.infer<typeof CreateTaxFilingPeriodSchema>
): Promise<ActionResult<{ taxFilingPeriodId: string }>> {
  try {
    const v = CreateTaxFilingPeriodSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "tax");
    requirePermission(ctx, "tax.liability.record");
    requireEntityScope(ctx, v.entityId);

    const admin = createSupabaseAdminClient();
    const { data: jur, error: je } = await admin
      .from("tax_jurisdictions")
      .select("id")
      .eq("id", v.taxJurisdictionId)
      .eq("tenant_id", v.tenantId)
      .single();
    if (je || !jur) return { success: false, message: "Tax jurisdiction not found." };

    const { data: row, error } = await admin
      .from("tax_filing_periods")
      .insert({
        tenant_id: v.tenantId,
        entity_id: v.entityId,
        tax_jurisdiction_id: v.taxJurisdictionId,
        period_code: v.periodCode,
        period_start: v.periodStart,
        period_end: v.periodEnd,
        filing_due_date: v.filingDueDate ?? null,
        filing_status: "open",
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: v.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "tax",
      actionCode: "tax.filing_period.create",
      targetTable: "tax_filing_periods",
      targetRecordId: row.id,
      newValues: { periodCode: v.periodCode },
    });

    return { success: true, message: "Filing period recorded.", data: { taxFilingPeriodId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const CreateTaxComplianceTaskSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid(),
  taskCode: z.string().min(1).max(64),
  taskName: z.string().min(1).max(255),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function createTaxComplianceTask(
  input: z.infer<typeof CreateTaxComplianceTaskSchema>
): Promise<ActionResult<{ taxComplianceTaskId: string }>> {
  try {
    const v = CreateTaxComplianceTaskSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "tax");
    requirePermission(ctx, "tax.liability.record");
    requireEntityScope(ctx, v.entityId);

    const admin = createSupabaseAdminClient();
    const { data: row, error } = await admin
      .from("tax_compliance_tasks")
      .insert({
        tenant_id: v.tenantId,
        entity_id: v.entityId,
        task_code: v.taskCode,
        task_name: v.taskName,
        task_status: "open",
        due_date: v.dueDate ?? null,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: v.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "tax",
      actionCode: "tax.compliance_task.create",
      targetTable: "tax_compliance_tasks",
      targetRecordId: row.id,
      newValues: { taskCode: v.taskCode },
    });

    return { success: true, message: "Compliance task created.", data: { taxComplianceTaskId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const CreateDirectDepositBatchSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid(),
  payrollRunId: z.string().uuid().optional(),
  notes: z.string().max(2000).optional(),
});

export async function createDirectDepositBatch(
  input: z.infer<typeof CreateDirectDepositBatchSchema>
): Promise<ActionResult<{ directDepositBatchId: string }>> {
  try {
    const v = CreateDirectDepositBatchSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "tax");
    requirePermission(ctx, "tax.liability.record");
    requireEntityScope(ctx, v.entityId);

    const admin = createSupabaseAdminClient();
    if (v.payrollRunId) {
      const { data: pr, error: pe } = await admin
        .from("payroll_runs")
        .select("id, tenant_id, entity_id")
        .eq("id", v.payrollRunId)
        .single();
      if (pe || !pr || pr.tenant_id !== v.tenantId || pr.entity_id !== v.entityId) {
        return { success: false, message: "Payroll run not found for this entity." };
      }
    }

    const { data: row, error } = await admin
      .from("direct_deposit_batches")
      .insert({
        tenant_id: v.tenantId,
        entity_id: v.entityId,
        payroll_run_id: v.payrollRunId ?? null,
        batch_status: "draft",
        notes: v.notes ?? null,
        created_by: ctx.platformUserId,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: v.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "tax",
      actionCode: "tax.direct_deposit_batch.create",
      targetTable: "direct_deposit_batches",
      targetRecordId: row.id,
      newValues: { payrollRunId: v.payrollRunId ?? null },
    });

    return { success: true, message: "Direct deposit batch created.", data: { directDepositBatchId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const CreateDirectDepositBatchItemSchema = z.object({
  tenantId: z.string().uuid(),
  directDepositBatchId: z.string().uuid(),
  employeePayProfileId: z.string().uuid(),
  amount: z.number().positive(),
  traceReference: z.string().max(128).optional(),
});

export async function createDirectDepositBatchItem(
  input: z.infer<typeof CreateDirectDepositBatchItemSchema>
): Promise<ActionResult<{ batchItemId: string }>> {
  try {
    const v = CreateDirectDepositBatchItemSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "tax");
    requirePermission(ctx, "tax.liability.record");

    const admin = createSupabaseAdminClient();
    const { data: batch, error: be } = await admin
      .from("direct_deposit_batches")
      .select("id, entity_id, tenant_id")
      .eq("id", v.directDepositBatchId)
      .eq("tenant_id", v.tenantId)
      .single();
    if (be || !batch) return { success: false, message: "Deposit batch not found." };
    requireEntityScope(ctx, batch.entity_id);

    const { data: prof, error: pe } = await admin
      .from("employee_pay_profiles")
      .select("id, tenant_id, entity_id")
      .eq("id", v.employeePayProfileId)
      .single();
    if (pe || !prof || prof.tenant_id !== v.tenantId || prof.entity_id !== batch.entity_id) {
      return { success: false, message: "Pay profile not found for this batch entity." };
    }

    const { data: row, error } = await admin
      .from("direct_deposit_batch_items")
      .insert({
        tenant_id: v.tenantId,
        direct_deposit_batch_id: v.directDepositBatchId,
        employee_pay_profile_id: v.employeePayProfileId,
        amount: Number(v.amount.toFixed(2)),
        trace_reference: v.traceReference ?? null,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: batch.entity_id,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "tax",
      actionCode: "tax.direct_deposit_batch_item.create",
      targetTable: "direct_deposit_batch_items",
      targetRecordId: row.id,
      newValues: { batchId: v.directDepositBatchId, amount: v.amount },
    });

    return { success: true, message: "Batch line added.", data: { batchItemId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}
