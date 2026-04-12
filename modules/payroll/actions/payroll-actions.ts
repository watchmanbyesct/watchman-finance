"use server";

import { createSupabaseAdminClient } from "@/lib/db/supabase-server";
import { resolveRequestContext } from "@/lib/context/resolve-request-context";
import { requirePermission, requireEntityScope, requireModuleEntitlement } from "@/lib/permissions/require-permission";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { mapErrorToResult, type ActionResult } from "@/lib/errors/app-error";
import { z } from "zod";

const CreatePayrollRunSchema = z.object({
  tenantId:    z.string().uuid(),
  entityId:    z.string().uuid(),
  payGroupId:  z.string().uuid(),
  payPeriodId: z.string().uuid(),
  notes:       z.string().optional(),
});

/**
 * Create a new payroll run in draft status.
 * Permission: payroll.run.create
 * Module: payroll
 *
 * This creates the run header only. Calculation is a separate step.
 * Finalization and ACH generation are separate controlled steps.
 */
export async function createPayrollRun(
  input: z.infer<typeof CreatePayrollRunSchema>
): Promise<ActionResult<{ payrollRunId: string }>> {
  try {
    const validated = CreatePayrollRunSchema.parse(input);
    const ctx = await resolveRequestContext(validated.tenantId);
    requireModuleEntitlement(ctx, "payroll");
    requirePermission(ctx, "payroll.run.create");
    requireEntityScope(ctx, validated.entityId);

    const admin = createSupabaseAdminClient();

    // Block duplicate active run for same pay period
    const { data: existingRun } = await admin
      .from("payroll_runs")
      .select("id, status")
      .eq("tenant_id", validated.tenantId)
      .eq("entity_id", validated.entityId)
      .eq("pay_period_id", validated.payPeriodId)
      .neq("status", "reversed")
      .single();

    if (existingRun) {
      return {
        success: false,
        message: `A payroll run already exists for this pay period (status: ${existingRun.status}).`,
        errors: [{ code: "conflict", message: "payroll_run_already_exists" }],
      };
    }

    // Verify pay period belongs to tenant and is open
    const { data: payPeriod } = await admin
      .from("pay_periods")
      .select("status, period_start, period_end")
      .eq("id", validated.payPeriodId)
      .eq("tenant_id", validated.tenantId)
      .single();

    if (!payPeriod) {
      return { success: false, message: "Pay period not found." };
    }
    if (payPeriod.status === "closed") {
      return { success: false, message: "Cannot create a payroll run for a closed pay period." };
    }

    const { data: run, error } = await admin
      .from("payroll_runs")
      .insert({
        tenant_id:        validated.tenantId,
        entity_id:        validated.entityId,
        pay_group_id:     validated.payGroupId,
        pay_period_id:    validated.payPeriodId,
        status:           "draft",
        total_gross:      0,
        total_net:        0,
        total_employer_tax: 0,
        notes:            validated.notes ?? null,
        created_by:       ctx.platformUserId,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId:            validated.tenantId,
      entityId:            validated.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey:           "payroll",
      actionCode:          "payroll.run.create",
      targetTable:         "payroll_runs",
      targetRecordId:      run.id,
      newValues:           { payGroupId: validated.payGroupId, payPeriodId: validated.payPeriodId },
    });

    return {
      success: true,
      message: "Payroll run created in draft. Run calculation to load earnings.",
      data: { payrollRunId: run.id },
    };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

/**
 * Submit a draft payroll run for calculation.
 * Status transition: draft -> calculating
 * Permission: payroll.run.calculate
 *
 * Actual calculation logic is handled by the payroll-engine edge function.
 * This action initiates the job and marks the run for processing.
 */
export async function submitPayrollRunForCalculation(input: {
  tenantId:     string;
  entityId:     string;
  payrollRunId: string;
}): Promise<ActionResult> {
  try {
    const ctx = await resolveRequestContext(input.tenantId);
    requireModuleEntitlement(ctx, "payroll");
    requirePermission(ctx, "payroll.run.calculate");
    requireEntityScope(ctx, input.entityId);

    const admin = createSupabaseAdminClient();

    const { data: run } = await admin
      .from("payroll_runs")
      .select("status")
      .eq("id", input.payrollRunId)
      .eq("tenant_id", input.tenantId)
      .single();

    if (!run) return { success: false, message: "Payroll run not found." };
    if (run.status !== "draft") {
      return {
        success: false,
        message: `Payroll run is in status '${run.status}'. Only draft runs can be submitted for calculation.`,
      };
    }

    const { error } = await admin
      .from("payroll_runs")
      .update({ status: "calculating", calculation_requested_at: new Date().toISOString() })
      .eq("id", input.payrollRunId);

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId:            input.tenantId,
      entityId:            input.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey:           "payroll",
      actionCode:          "payroll.run.submit_for_calculation",
      targetTable:         "payroll_runs",
      targetRecordId:      input.payrollRunId,
      oldValues:           { status: "draft" },
      newValues:           { status: "calculating" },
    });

    return {
      success: true,
      message: "Payroll run submitted for calculation. The payroll engine will process it shortly.",
    };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

/**
 * Approve a calculated payroll run for release.
 * Status transition: review -> approved
 * Permission: payroll.run.approve
 *
 * Approval is required before finalization and ACH generation.
 */
export async function approvePayrollRun(input: {
  tenantId:     string;
  entityId:     string;
  payrollRunId: string;
  approvalNotes?: string;
}): Promise<ActionResult> {
  try {
    const ctx = await resolveRequestContext(input.tenantId);
    requireModuleEntitlement(ctx, "payroll");
    requirePermission(ctx, "payroll.run.approve");
    requireEntityScope(ctx, input.entityId);

    const admin = createSupabaseAdminClient();

    const { data: run } = await admin
      .from("payroll_runs")
      .select("status")
      .eq("id", input.payrollRunId)
      .eq("tenant_id", input.tenantId)
      .single();

    if (!run) return { success: false, message: "Payroll run not found." };
    if (run.status !== "review") {
      return {
        success: false,
        message: `Payroll run must be in 'review' status to approve. Current status: ${run.status}.`,
      };
    }

    const { error } = await admin
      .from("payroll_runs")
      .update({
        status:          "approved",
        approved_by:     ctx.platformUserId,
        approved_at:     new Date().toISOString(),
        approval_notes:  input.approvalNotes ?? null,
      })
      .eq("id", input.payrollRunId);

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId:            input.tenantId,
      entityId:            input.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey:           "payroll",
      actionCode:          "payroll.run.approve",
      targetTable:         "payroll_runs",
      targetRecordId:      input.payrollRunId,
      oldValues:           { status: "review" },
      newValues:           { status: "approved", approvedBy: ctx.platformUserId },
    });

    return {
      success: true,
      message: "Payroll run approved. Proceed to finalize and generate ACH batch.",
    };
  } catch (err) {
    return mapErrorToResult(err);
  }
}
