/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

"use server";

import { createHash, randomUUID } from "crypto";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/db/supabase-server";
import { resolveRequestContext } from "@/lib/context/resolve-request-context";
import { requirePermission, requireEntityScope } from "@/lib/permissions/require-permission";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { mapErrorToResult, type ActionResult } from "@/lib/errors/app-error";

const PromoteStagedEmployeeSchema = z.object({
  tenantId:         z.string().uuid(),
  stagedEmployeeId: z.string().uuid(),
});

/**
 * Promote a validated staged_employees row into finance_people (+ external_id_mappings).
 * Permission: integration.staging.promote
 */
export async function promoteStagedEmployee(
  input: z.infer<typeof PromoteStagedEmployeeSchema>
): Promise<ActionResult<{ financePersonId: string }>> {
  try {
    const parsed = PromoteStagedEmployeeSchema.parse(input);
    const ctx = await resolveRequestContext(parsed.tenantId);
    requirePermission(ctx, "integration.staging.promote");

    const admin = createSupabaseAdminClient();

    const { data: staged, error: fetchErr } = await admin
      .from("staged_employees")
      .select("id, entity_id, source_record_id, payload_json, validation_status")
      .eq("id", parsed.stagedEmployeeId)
      .eq("tenant_id", parsed.tenantId)
      .single();

    if (fetchErr || !staged) {
      return { success: false, message: "Staged employee not found." };
    }

    if (staged.validation_status === "promoted") {
      return { success: false, message: "This record was already promoted." };
    }

    const payload = staged.payload_json as Record<string, unknown>;
    const legalFirstName = String(payload.legal_first_name ?? payload.first_name ?? "").trim();
    const legalLastName = String(payload.legal_last_name ?? payload.last_name ?? "").trim();

    if (!legalFirstName || !legalLastName) {
      return {
        success: false,
        message: "Staging payload is missing legal first and last name.",
        errors: [{ code: "validation_failed", message: "missing_name" }],
      };
    }

    if (staged.entity_id) {
      requireEntityScope(ctx, staged.entity_id);
    }

    const row = {
      tenant_id:           parsed.tenantId,
      entity_id:            staged.entity_id,
      person_type:          "employee",
      legal_first_name:     legalFirstName,
      legal_last_name:      legalLastName,
      middle_name:          (payload.middle_name as string | undefined) ?? null,
      preferred_name:       (payload.preferred_name as string | undefined) ?? null,
      email:                (payload.email as string | undefined) ?? null,
      phone:                (payload.phone as string | undefined) ?? null,
      employment_status:    String(payload.employment_status ?? "active"),
      hire_date:            (payload.hire_date as string | undefined) ?? null,
      source_system_key:    "watchman_launch",
      source_record_id:     staged.source_record_id,
    };

    const { data: existing } = await admin
      .from("finance_people")
      .select("id")
      .eq("tenant_id", parsed.tenantId)
      .eq("source_system_key", "watchman_launch")
      .eq("source_record_id", staged.source_record_id)
      .maybeSingle();

    let financePersonId: string;

    if (existing?.id) {
      const { data: updated, error: upErr } = await admin
        .from("finance_people")
        .update({
          entity_id:         row.entity_id,
          legal_first_name:  row.legal_first_name,
          legal_last_name:   row.legal_last_name,
          middle_name:       row.middle_name,
          preferred_name:    row.preferred_name,
          email:             row.email,
          phone:             row.phone,
          employment_status: row.employment_status,
          hire_date:         row.hire_date,
          updated_at:        new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select("id")
        .single();
      if (upErr) throw new Error(upErr.message);
      financePersonId = updated!.id;
    } else {
      const { data: inserted, error: insErr } = await admin
        .from("finance_people")
        .insert(row)
        .select("id")
        .single();
      if (insErr) throw new Error(insErr.message);
      financePersonId = inserted!.id;
    }

    const { error: stErr } = await admin
      .from("staged_employees")
      .update({
        validation_status: "promoted",
        promoted_at:         new Date().toISOString(),
        promoted_record_id: financePersonId,
      })
      .eq("id", parsed.stagedEmployeeId);

    if (stErr) throw new Error(stErr.message);

    const { error: mapErr } = await admin.from("external_id_mappings").upsert(
      {
        tenant_id:           parsed.tenantId,
        entity_id:           staged.entity_id,
        source_system_key:   "watchman_launch",
        source_record_type:  "employee",
        source_record_id:    staged.source_record_id,
        target_table:        "finance_people",
        target_record_id:    financePersonId,
        mapping_status:      "active",
        updated_at:          new Date().toISOString(),
      },
      { onConflict: "tenant_id,source_system_key,source_record_type,source_record_id,target_table" }
    );

    if (mapErr) throw new Error(mapErr.message);

    await writeAuditLog({
      tenantId:            parsed.tenantId,
      entityId:            staged.entity_id ?? undefined,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey:           "finance_core",
      actionCode:          "integration.promote_staged_employee",
      targetTable:         "finance_people",
      targetRecordId:      financePersonId,
      metadata:            { stagedEmployeeId: parsed.stagedEmployeeId },
    });

    return {
      success: true,
      message: "Employee promoted to finance_people.",
      data: { financePersonId },
    };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const StageManualEmployeeSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid().optional(),
  sourceRecordId: z.string().min(1).max(255),
  legalFirstName: z.string().min(1),
  legalLastName: z.string().min(1),
  email: z.string().email().optional(),
});

/**
 * Stage an employee payload (same shape as Launch integration), for manual testing or corrections.
 * Permission: integration.staging.promote
 */
export async function stageManualStagedEmployee(
  input: z.infer<typeof StageManualEmployeeSchema>
): Promise<ActionResult<{ stagedEmployeeId: string }>> {
  try {
    const v = StageManualEmployeeSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requirePermission(ctx, "integration.staging.promote");
    if (v.entityId) requireEntityScope(ctx, v.entityId);

    const employee = {
      legal_first_name: v.legalFirstName,
      legal_last_name: v.legalLastName,
      email: v.email ?? undefined,
      employment_status: "active",
    };

    const dedupeKey = createHash("sha256")
      .update(`watchman_launch:employee:${v.sourceRecordId}:${JSON.stringify(employee)}`)
      .digest("hex");

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("staged_employees")
      .upsert(
        {
          tenant_id: v.tenantId,
          entity_id: v.entityId ?? null,
          source_system_key: "watchman_launch",
          source_record_id: v.sourceRecordId,
          dedupe_key: dedupeKey,
          payload_json: employee,
          normalized_json: {},
          validation_status: "pending",
          correlation_id: randomUUID(),
        },
        { onConflict: "tenant_id,dedupe_key" }
      )
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: v.entityId ?? null,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "finance_core",
      actionCode: "integration.stage_employee_manual",
      targetTable: "staged_employees",
      targetRecordId: data.id,
      newValues: { sourceRecordId: v.sourceRecordId },
    });

    return { success: true, message: "Employee staged.", data: { stagedEmployeeId: data.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const StageManualTimeEntrySchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid().optional(),
  sourceRecordId: z.string().min(1).max(255),
  employeeSourceRecordId: z.string().min(1).max(255),
  payPeriodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  payPeriodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  regularHours: z.number().nonnegative().default(0),
  overtimeHours: z.number().nonnegative().default(0),
});

/**
 * Stage approved-style time for payroll ingestion (mirrors Operations integration contract).
 * Permission: integration.staging.promote
 */
export async function stageManualStagedTimeEntry(
  input: z.infer<typeof StageManualTimeEntrySchema>
): Promise<ActionResult<{ stagedTimeEntryId: string }>> {
  try {
    const v = StageManualTimeEntrySchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requirePermission(ctx, "integration.staging.promote");
    if (v.entityId) requireEntityScope(ctx, v.entityId);

    const timeEntry = {
      employee_source_record_id: v.employeeSourceRecordId,
      regular_hours: v.regularHours,
      overtime_hours: v.overtimeHours,
    };

    const dedupeKey = createHash("sha256")
      .update(`watchman_operations:approved_time:${v.sourceRecordId}:${JSON.stringify(timeEntry)}`)
      .digest("hex");

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("staged_time_entries")
      .upsert(
        {
          tenant_id: v.tenantId,
          entity_id: v.entityId ?? null,
          source_system_key: "watchman_operations",
          source_record_id: v.sourceRecordId,
          employee_source_record_id: v.employeeSourceRecordId,
          pay_period_start: v.payPeriodStart ?? null,
          pay_period_end: v.payPeriodEnd ?? null,
          dedupe_key: dedupeKey,
          payload_json: timeEntry,
          normalized_json: {},
          approval_status: "approved",
          validation_status: "pending",
          correlation_id: randomUUID(),
        },
        { onConflict: "tenant_id,dedupe_key" }
      )
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: v.entityId ?? null,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "finance_core",
      actionCode: "integration.stage_time_manual",
      targetTable: "staged_time_entries",
      targetRecordId: data.id,
      newValues: { sourceRecordId: v.sourceRecordId },
    });

    return { success: true, message: "Time entry staged.", data: { stagedTimeEntryId: data.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const StageManualServiceEventSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid().optional(),
  sourceRecordId: z.string().min(1).max(255),
  serviceType: z.string().min(1).max(120),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(2000).optional(),
});

/**
 * Stage a service event for downstream billing workflows.
 * Permission: integration.staging.promote
 */
export async function stageManualStagedServiceEvent(
  input: z.infer<typeof StageManualServiceEventSchema>
): Promise<ActionResult<{ stagedServiceEventId: string }>> {
  try {
    const v = StageManualServiceEventSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requirePermission(ctx, "integration.staging.promote");
    if (v.entityId) requireEntityScope(ctx, v.entityId);

    const payload = { service_type: v.serviceType, notes: v.notes ?? null };
    const dedupeKey = createHash("sha256")
      .update(`watchman_operations:service_event:${v.sourceRecordId}:${JSON.stringify(payload)}`)
      .digest("hex");

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("staged_service_events")
      .upsert(
        {
          tenant_id: v.tenantId,
          entity_id: v.entityId ?? null,
          source_system_key: "watchman_operations",
          source_record_id: v.sourceRecordId,
          dedupe_key: dedupeKey,
          payload_json: payload,
          normalized_json: {},
          event_date: v.eventDate ?? null,
          service_type: v.serviceType,
          validation_status: "pending",
          correlation_id: randomUUID(),
        },
        { onConflict: "tenant_id,dedupe_key" }
      )
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: v.entityId ?? null,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "finance_core",
      actionCode: "integration.stage_service_event_manual",
      targetTable: "staged_service_events",
      targetRecordId: data.id,
      newValues: { sourceRecordId: v.sourceRecordId },
    });

    return { success: true, message: "Service event staged.", data: { stagedServiceEventId: data.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}
