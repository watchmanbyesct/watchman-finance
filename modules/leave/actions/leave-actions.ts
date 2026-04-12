"use server";

import { createSupabaseAdminClient } from "@/lib/db/supabase-server";
import { resolveRequestContext } from "@/lib/context/resolve-request-context";
import { requirePermission, requireEntityScope, requireModuleEntitlement } from "@/lib/permissions/require-permission";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { mapErrorToResult, type ActionResult } from "@/lib/errors/app-error";
import { z } from "zod";

const LeaveCategorySchema = z.enum([
  "sick",
  "vacation",
  "personal",
  "pto",
  "holiday",
  "bereavement",
  "jury_duty",
  "administrative",
  "training",
  "unpaid",
  "other",
]);

const CreateLeaveTypeSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid().optional(),
  leaveCode: z.string().min(1).max(80),
  leaveName: z.string().min(1),
  leaveCategory: LeaveCategorySchema,
  isPaid: z.boolean().default(true),
});

/** Permission: leave.policy.manage */
export async function createLeaveType(
  input: z.infer<typeof CreateLeaveTypeSchema>
): Promise<ActionResult<{ leaveTypeId: string }>> {
  try {
    const validated = CreateLeaveTypeSchema.parse(input);
    const ctx = await resolveRequestContext(validated.tenantId);
    requireModuleEntitlement(ctx, "leave");
    requirePermission(ctx, "leave.policy.manage");
    if (validated.entityId) requireEntityScope(ctx, validated.entityId);

    const admin = createSupabaseAdminClient();
    const { data: row, error } = await admin
      .from("leave_types")
      .insert({
        tenant_id: validated.tenantId,
        entity_id: validated.entityId ?? null,
        leave_code: validated.leaveCode,
        leave_name: validated.leaveName,
        leave_category: validated.leaveCategory,
        is_paid: validated.isPaid,
        status: "active",
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: validated.tenantId,
      entityId: validated.entityId ?? null,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "leave",
      actionCode: "leave.type.create",
      targetTable: "leave_types",
      targetRecordId: row.id,
      newValues: { leaveCode: validated.leaveCode },
    });

    return { success: true, message: "Leave type created.", data: { leaveTypeId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const AccrualMethodSchema = z.enum([
  "hours_worked",
  "per_pay_period",
  "monthly",
  "anniversary",
  "fixed_annual",
  "front_loaded",
]);

const CreateLeavePolicySchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid(),
  policyCode: z.string().min(1).max(80),
  policyName: z.string().min(1),
  leaveTypeId: z.string().uuid(),
  accrualMethod: AccrualMethodSchema,
  accrualRate: z.number().optional(),
  annualGrantHours: z.number().optional(),
  maxBalanceHours: z.number().optional(),
  carryoverHours: z.number().optional(),
  waitingPeriodDays: z.number().int().min(0).default(0),
  allowsNegativeBalance: z.boolean().default(false),
  minimumIncrementHours: z.number().positive().default(1),
});

/** Permission: leave.policy.manage */
export async function createLeavePolicy(
  input: z.infer<typeof CreateLeavePolicySchema>
): Promise<ActionResult<{ leavePolicyId: string }>> {
  try {
    const validated = CreateLeavePolicySchema.parse(input);
    const ctx = await resolveRequestContext(validated.tenantId);
    requireModuleEntitlement(ctx, "leave");
    requirePermission(ctx, "leave.policy.manage");
    requireEntityScope(ctx, validated.entityId);

    const admin = createSupabaseAdminClient();

    const { data: lt, error: lte } = await admin
      .from("leave_types")
      .select("id, tenant_id")
      .eq("id", validated.leaveTypeId)
      .eq("tenant_id", validated.tenantId)
      .single();

    if (lte || !lt) {
      return { success: false, message: "Leave type not found for this tenant." };
    }

    const { data: row, error } = await admin
      .from("leave_policies")
      .insert({
        tenant_id: validated.tenantId,
        entity_id: validated.entityId,
        policy_code: validated.policyCode,
        policy_name: validated.policyName,
        leave_type_id: validated.leaveTypeId,
        accrual_method: validated.accrualMethod,
        accrual_rate: validated.accrualRate ?? null,
        annual_grant_hours: validated.annualGrantHours ?? null,
        max_balance_hours: validated.maxBalanceHours ?? null,
        carryover_hours: validated.carryoverHours ?? null,
        waiting_period_days: validated.waitingPeriodDays,
        allows_negative_balance: validated.allowsNegativeBalance,
        minimum_increment_hours: validated.minimumIncrementHours,
        status: "active",
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: validated.tenantId,
      entityId: validated.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "leave",
      actionCode: "leave.policy.create",
      targetTable: "leave_policies",
      targetRecordId: row.id,
      newValues: { policyCode: validated.policyCode },
    });

    return { success: true, message: "Leave policy created.", data: { leavePolicyId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const AssignLeavePolicySchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid(),
  leavePolicyId: z.string().uuid(),
  financePersonId: z.string().uuid(),
  effectiveStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  effectiveEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/** Permission: leave.policy.manage */
export async function assignLeavePolicy(
  input: z.infer<typeof AssignLeavePolicySchema>
): Promise<ActionResult<{ assignmentId: string }>> {
  try {
    const validated = AssignLeavePolicySchema.parse(input);
    const ctx = await resolveRequestContext(validated.tenantId);
    requireModuleEntitlement(ctx, "leave");
    requirePermission(ctx, "leave.policy.manage");
    requireEntityScope(ctx, validated.entityId);

    const admin = createSupabaseAdminClient();

    const { data: policy, error: pe } = await admin
      .from("leave_policies")
      .select("id, leave_type_id")
      .eq("id", validated.leavePolicyId)
      .eq("tenant_id", validated.tenantId)
      .eq("entity_id", validated.entityId)
      .single();

    if (pe || !policy) {
      return { success: false, message: "Leave policy not found for this entity." };
    }

    const { data: assignment, error: ae } = await admin
      .from("leave_policy_assignments")
      .insert({
        tenant_id: validated.tenantId,
        entity_id: validated.entityId,
        leave_policy_id: validated.leavePolicyId,
        finance_person_id: validated.financePersonId,
        assignment_status: "active",
        effective_start_date: validated.effectiveStartDate,
        effective_end_date: validated.effectiveEndDate ?? null,
        assigned_by: ctx.platformUserId,
      })
      .select("id")
      .single();

    if (ae) throw new Error(ae.message);

    const { error: profE } = await admin.from("employee_leave_profiles").upsert(
      {
        tenant_id: validated.tenantId,
        entity_id: validated.entityId,
        finance_person_id: validated.financePersonId,
        leave_type_id: policy.leave_type_id,
        current_balance_hours: 0,
        available_balance_hours: 0,
        pending_balance_hours: 0,
        ytd_used_hours: 0,
        status: "active",
      },
      {
        onConflict: "finance_person_id,leave_type_id",
        ignoreDuplicates: true,
      }
    );

    if (profE) throw new Error(profE.message);

    await writeAuditLog({
      tenantId: validated.tenantId,
      entityId: validated.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "leave",
      actionCode: "leave.policy.assign",
      targetTable: "leave_policy_assignments",
      targetRecordId: assignment.id,
      newValues: { leavePolicyId: validated.leavePolicyId, financePersonId: validated.financePersonId },
    });

    return { success: true, message: "Leave policy assigned.", data: { assignmentId: assignment.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const DaySchema = z.object({
  requestDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  requestedHours: z.number().nonnegative(),
});

const SubmitLeaveRequestSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid(),
  financePersonId: z.string().uuid(),
  leaveTypeId: z.string().uuid(),
  requestStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  requestEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  days: z.array(DaySchema).min(1),
  employeeNotes: z.string().optional(),
});

/** Permission: leave.request.create */
export async function submitLeaveRequest(
  input: z.infer<typeof SubmitLeaveRequestSchema>
): Promise<ActionResult<{ leaveRequestId: string }>> {
  try {
    const validated = SubmitLeaveRequestSchema.parse(input);
    const ctx = await resolveRequestContext(validated.tenantId);
    requireModuleEntitlement(ctx, "leave");
    requirePermission(ctx, "leave.request.create");
    requireEntityScope(ctx, validated.entityId);

    const admin = createSupabaseAdminClient();

    const totalRequestedHours = Number(
      validated.days.reduce((sum: number, d) => sum + d.requestedHours, 0).toFixed(2)
    );

    const { data: req, error: re } = await admin
      .from("leave_requests")
      .insert({
        tenant_id: validated.tenantId,
        entity_id: validated.entityId,
        finance_person_id: validated.financePersonId,
        leave_type_id: validated.leaveTypeId,
        request_status: "submitted",
        request_start_date: validated.requestStartDate,
        request_end_date: validated.requestEndDate,
        total_requested_hours: totalRequestedHours,
        total_approved_hours: 0,
        employee_notes: validated.employeeNotes ?? null,
        submitted_at: new Date().toISOString(),
        created_by: ctx.platformUserId,
      })
      .select("id")
      .single();

    if (re) throw new Error(re.message);

    const dayRows = validated.days.map((d) => ({
      tenant_id: validated.tenantId,
      leave_request_id: req.id,
      request_date: d.requestDate,
      requested_hours: d.requestedHours,
      approved_hours: 0,
      day_status: "requested" as const,
    }));

    const { error: de } = await admin.from("leave_request_days").insert(dayRows);
    if (de) throw new Error(de.message);

    await writeAuditLog({
      tenantId: validated.tenantId,
      entityId: validated.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "leave",
      actionCode: "leave.request.submit",
      targetTable: "leave_requests",
      targetRecordId: req.id,
      newValues: { totalRequestedHours },
    });

    return { success: true, message: "Leave request submitted.", data: { leaveRequestId: req.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const ApprovedDaySchema = z.object({
  requestDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  approvedHours: z.number().nonnegative(),
});

const ApproveLeaveRequestSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid(),
  leaveRequestId: z.string().uuid(),
  approvedDays: z.array(ApprovedDaySchema).optional(),
  approvalNotes: z.string().optional(),
});

/** Permission: leave.request.approve */
export async function approveLeaveRequest(
  input: z.infer<typeof ApproveLeaveRequestSchema>
): Promise<ActionResult<{ leaveRequestId: string; totalApprovedHours: number }>> {
  try {
    const validated = ApproveLeaveRequestSchema.parse(input);
    const ctx = await resolveRequestContext(validated.tenantId);
    requireModuleEntitlement(ctx, "leave");
    requirePermission(ctx, "leave.request.approve");
    requireEntityScope(ctx, validated.entityId);

    const admin = createSupabaseAdminClient();

    const { data: existing, error: fe } = await admin
      .from("leave_requests")
      .select("id, request_status, total_requested_hours")
      .eq("id", validated.leaveRequestId)
      .eq("tenant_id", validated.tenantId)
      .eq("entity_id", validated.entityId)
      .single();

    if (fe || !existing) return { success: false, message: "Leave request not found." };
    if (existing.request_status !== "submitted") {
      return {
        success: false,
        message: `Only submitted requests can be approved (current: ${existing.request_status}).`,
      };
    }

    if (validated.approvedDays?.length) {
      for (const day of validated.approvedDays) {
        const { error: ue } = await admin
          .from("leave_request_days")
          .update({
            approved_hours: day.approvedHours,
            day_status: day.approvedHours > 0 ? "approved" : "rejected",
          })
          .eq("leave_request_id", validated.leaveRequestId)
          .eq("request_date", day.requestDate);

        if (ue) throw new Error(ue.message);
      }

      const { data: dayRows } = await admin
        .from("leave_request_days")
        .select("approved_hours")
        .eq("leave_request_id", validated.leaveRequestId);

      const totalApprovedHours = Number(
        (dayRows ?? []).reduce((s: number, r: { approved_hours: string | number }) => s + Number(r.approved_hours), 0).toFixed(2)
      );

      const { error: re } = await admin
        .from("leave_requests")
        .update({
          request_status: "approved",
          total_approved_hours: totalApprovedHours,
          manager_notes: validated.approvalNotes ?? null,
        })
        .eq("id", validated.leaveRequestId);

      if (re) throw new Error(re.message);

      const { error: ae } = await admin.from("leave_approvals").insert({
        tenant_id: validated.tenantId,
        entity_id: validated.entityId,
        leave_request_id: validated.leaveRequestId,
        approval_step: "manager",
        approval_status: "approved",
        approver_platform_user_id: ctx.platformUserId,
        approval_notes: validated.approvalNotes ?? null,
      });

      if (ae) throw new Error(ae.message);

      await writeAuditLog({
        tenantId: validated.tenantId,
        entityId: validated.entityId,
        actorPlatformUserId: ctx.platformUserId,
        moduleKey: "leave",
        actionCode: "leave.request.approve",
        targetTable: "leave_requests",
        targetRecordId: validated.leaveRequestId,
        metadata: { totalApprovedHours },
      });

      return {
        success: true,
        message: "Leave request approved.",
        data: { leaveRequestId: validated.leaveRequestId, totalApprovedHours },
      };
    }

    const totalApprovedHours = Number(existing.total_requested_hours ?? 0);

    const { data: allDays, error: gde } = await admin
      .from("leave_request_days")
      .select("id, requested_hours")
      .eq("leave_request_id", validated.leaveRequestId);

    if (gde) throw new Error(gde.message);

    for (const row of allDays ?? []) {
      const { error: ue } = await admin
        .from("leave_request_days")
        .update({
          approved_hours: Number(row.requested_hours),
          day_status: "approved",
        })
        .eq("id", row.id);

      if (ue) throw new Error(ue.message);
    }

    const { error: re2 } = await admin
      .from("leave_requests")
      .update({
        request_status: "approved",
        total_approved_hours: totalApprovedHours,
        manager_notes: validated.approvalNotes ?? null,
      })
      .eq("id", validated.leaveRequestId);

    if (re2) throw new Error(re2.message);

    const { error: ae2 } = await admin.from("leave_approvals").insert({
      tenant_id: validated.tenantId,
      entity_id: validated.entityId,
      leave_request_id: validated.leaveRequestId,
      approval_step: "manager",
      approval_status: "approved",
      approver_platform_user_id: ctx.platformUserId,
      approval_notes: validated.approvalNotes ?? null,
    });

    if (ae2) throw new Error(ae2.message);

    await writeAuditLog({
      tenantId: validated.tenantId,
      entityId: validated.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "leave",
      actionCode: "leave.request.approve",
      targetTable: "leave_requests",
      targetRecordId: validated.leaveRequestId,
      metadata: { totalApprovedHours },
    });

    return {
      success: true,
      message: "Leave request approved.",
      data: { leaveRequestId: validated.leaveRequestId, totalApprovedHours },
    };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const RunLeaveAccrualsSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid(),
  asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/**
 * Applies policy accrual_rate to each matching active employee leave profile (Pack 005 heuristic).
 * Permission: leave.accrual.run
 */
export async function runLeaveAccruals(
  input: z.infer<typeof RunLeaveAccrualsSchema>
): Promise<ActionResult<{ processedProfiles: number }>> {
  try {
    const validated = RunLeaveAccrualsSchema.parse(input);
    const ctx = await resolveRequestContext(validated.tenantId);
    requireModuleEntitlement(ctx, "leave");
    requirePermission(ctx, "leave.accrual.run");
    requireEntityScope(ctx, validated.entityId);

    const admin = createSupabaseAdminClient();

    const { data: assignments, error: ae } = await admin
      .from("leave_policy_assignments")
      .select("finance_person_id, leave_policy_id")
      .eq("tenant_id", validated.tenantId)
      .eq("entity_id", validated.entityId)
      .eq("assignment_status", "active");

    if (ae) throw new Error(ae.message);

    const policyIds = [...new Set((assignments ?? []).map((a: { leave_policy_id: string }) => a.leave_policy_id))];
    if (!policyIds.length) {
      await writeAuditLog({
        tenantId: validated.tenantId,
        entityId: validated.entityId,
        actorPlatformUserId: ctx.platformUserId,
        moduleKey: "leave",
        actionCode: "leave.accrual.run",
        targetTable: "employee_leave_profiles",
        metadata: { asOfDate: validated.asOfDate, processedProfiles: 0 },
      });
      return { success: true, message: "No active policy assignments.", data: { processedProfiles: 0 } };
    }

    const { data: policies, error: pe } = await admin
      .from("leave_policies")
      .select("id, leave_type_id, accrual_rate")
      .in("id", policyIds);

    if (pe) throw new Error(pe.message);

    type PolRow = { id: string; leave_type_id: string; accrual_rate: string | number | null };
    const policyById = new Map<string, PolRow>((policies ?? []).map((p: PolRow) => [p.id, p]));

    const { data: profiles, error: pre } = await admin
      .from("employee_leave_profiles")
      .select("id, finance_person_id, leave_type_id, current_balance_hours")
      .eq("tenant_id", validated.tenantId)
      .eq("entity_id", validated.entityId)
      .eq("status", "active");

    if (pre) throw new Error(pre.message);

    type ProfileRow = {
      id: string;
      finance_person_id: string;
      leave_type_id: string;
      current_balance_hours: string | number;
    };

    let processedProfiles = 0;
    const processedIds = new Set<string>();

    for (const elp of (profiles ?? []) as ProfileRow[]) {
      if (processedIds.has(elp.id)) continue;

      const asg = (assignments ?? []).find((a: { finance_person_id: string; leave_policy_id: string }) => {
        if (a.finance_person_id !== elp.finance_person_id) return false;
        const p = policyById.get(a.leave_policy_id);
        return p?.leave_type_id === elp.leave_type_id;
      });
      if (!asg) continue;

      const pol = policyById.get(asg.leave_policy_id);
      if (!pol) continue;

      const accrualHours = Number(pol.accrual_rate ?? 0);
      if (!accrualHours) continue;

      const newBalance = Number((Number(elp.current_balance_hours) + accrualHours).toFixed(2));

      const { error: ue } = await admin
        .from("employee_leave_profiles")
        .update({
          current_balance_hours: newBalance,
          available_balance_hours: newBalance,
          last_accrual_at: new Date().toISOString(),
        })
        .eq("id", elp.id);

      if (ue) throw new Error(ue.message);

      const { error: le } = await admin.from("leave_balance_ledgers").insert({
        tenant_id: validated.tenantId,
        entity_id: validated.entityId,
        employee_leave_profile_id: elp.id,
        finance_person_id: elp.finance_person_id,
        leave_type_id: elp.leave_type_id,
        entry_type: "accrual",
        entry_date: validated.asOfDate,
        hours_delta: accrualHours,
        balance_after_hours: newBalance,
        source_type: "scheduled_accrual",
        notes: "Accrual run",
        created_by: ctx.platformUserId,
      });

      if (le) throw new Error(le.message);

      processedIds.add(elp.id);
      processedProfiles += 1;
    }

    await writeAuditLog({
      tenantId: validated.tenantId,
      entityId: validated.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "leave",
      actionCode: "leave.accrual.run",
      targetTable: "employee_leave_profiles",
      metadata: { asOfDate: validated.asOfDate, processedProfiles },
    });

    return {
      success: true,
      message: "Leave accrual run completed.",
      data: { processedProfiles },
    };
  } catch (err) {
    return mapErrorToResult(err);
  }
}
