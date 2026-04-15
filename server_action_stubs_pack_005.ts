/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

// Watchman Finance Server Action Starter Pack 005 v1
// Leave and accrual management action stubs.

export type UUID = string;

export interface ActionContext {
  authUserId: UUID;
  platformUserId: UUID;
  currentTenantId?: UUID;
  permissions: string[];
  entityIds: UUID[];
  correlationId: string;
}

export interface ActionResult<T> {
  success: boolean;
  message: string;
  data?: T;
  warnings?: string[];
  errors?: string[];
  correlationId: string;
}

export interface DbClient {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  transaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T>;
}

export interface AuditPayload {
  tenantId?: UUID;
  entityId?: UUID;
  actorPlatformUserId?: UUID;
  moduleKey: string;
  actionCode: string;
  targetTable: string;
  targetRecordId?: UUID;
  oldValues?: unknown;
  newValues?: unknown;
  metadata?: unknown;
  sourceChannel?: string;
}

export async function writeAuditLog(db: DbClient, payload: AuditPayload): Promise<void> {
  await db.query(
    `
    insert into public.audit_logs (
      tenant_id, entity_id, actor_platform_user_id, module_key, action_code,
      target_table, target_record_id, old_values_json, new_values_json,
      metadata_json, source_channel
    ) values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11)
    `,
    [
      payload.tenantId ?? null,
      payload.entityId ?? null,
      payload.actorPlatformUserId ?? null,
      payload.moduleKey,
      payload.actionCode,
      payload.targetTable,
      payload.targetRecordId ?? null,
      JSON.stringify(payload.oldValues ?? null),
      JSON.stringify(payload.newValues ?? null),
      JSON.stringify(payload.metadata ?? null),
      payload.sourceChannel ?? "api",
    ],
  );
}

export function requirePermission(ctx: ActionContext, permission: string): void {
  if (!ctx.permissions.includes(permission)) {
    throw new Error(`forbidden:${permission}`);
  }
}

export function requireEntityScope(ctx: ActionContext, entityId: UUID): void {
  if (!ctx.entityIds.includes(entityId)) {
    throw new Error(`entity_scope_mismatch:${entityId}`);
  }
}

export interface CreateLeaveTypeInput {
  tenantId: UUID;
  entityId?: UUID;
  leaveCode: string;
  leaveName: string;
  leaveCategory:
    | "sick" | "vacation" | "personal" | "pto" | "holiday"
    | "bereavement" | "jury_duty" | "administrative" | "training"
    | "unpaid" | "other";
  isPaid: boolean;
}

export async function createLeaveType(
  db: DbClient,
  ctx: ActionContext,
  input: CreateLeaveTypeInput,
): Promise<ActionResult<{ leaveTypeId: UUID }>> {
  requirePermission(ctx, "leave.policy.manage");
  if (input.entityId) requireEntityScope(ctx, input.entityId);

  const result = await db.query<{ id: UUID }>(
    `
    insert into public.leave_types (
      tenant_id, entity_id, leave_code, leave_name, leave_category, is_paid, status
    )
    values ($1,$2,$3,$4,$5,$6,'active')
    returning id
    `,
    [
      input.tenantId,
      input.entityId ?? null,
      input.leaveCode,
      input.leaveName,
      input.leaveCategory,
      input.isPaid,
    ],
  );

  const leaveTypeId = result.rows[0].id;

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    entityId: input.entityId,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "leave",
    actionCode: "leave.type.create",
    targetTable: "leave_types",
    targetRecordId: leaveTypeId,
    newValues: input,
  });

  return {
    success: true,
    message: "Leave type created successfully.",
    data: { leaveTypeId },
    correlationId: ctx.correlationId,
  };
}

export interface CreateLeavePolicyInput {
  tenantId: UUID;
  entityId: UUID;
  policyCode: string;
  policyName: string;
  leaveTypeId: UUID;
  accrualMethod: "hours_worked" | "per_pay_period" | "monthly" | "anniversary" | "fixed_annual" | "front_loaded";
  accrualRate?: number;
  annualGrantHours?: number;
  maxBalanceHours?: number;
  carryoverHours?: number;
  waitingPeriodDays?: number;
  allowsNegativeBalance?: boolean;
  minimumIncrementHours?: number;
}

export async function createLeavePolicy(
  db: DbClient,
  ctx: ActionContext,
  input: CreateLeavePolicyInput,
): Promise<ActionResult<{ leavePolicyId: UUID }>> {
  requirePermission(ctx, "leave.policy.manage");
  requireEntityScope(ctx, input.entityId);

  const result = await db.query<{ id: UUID }>(
    `
    insert into public.leave_policies (
      tenant_id, entity_id, policy_code, policy_name, leave_type_id,
      accrual_method, accrual_rate, annual_grant_hours, max_balance_hours,
      carryover_hours, waiting_period_days, allows_negative_balance,
      minimum_increment_hours, status
    )
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'active')
    returning id
    `,
    [
      input.tenantId,
      input.entityId,
      input.policyCode,
      input.policyName,
      input.leaveTypeId,
      input.accrualMethod,
      input.accrualRate ?? null,
      input.annualGrantHours ?? null,
      input.maxBalanceHours ?? null,
      input.carryoverHours ?? null,
      input.waitingPeriodDays ?? 0,
      input.allowsNegativeBalance ?? false,
      input.minimumIncrementHours ?? 1.0,
    ],
  );

  const leavePolicyId = result.rows[0].id;

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    entityId: input.entityId,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "leave",
    actionCode: "leave.policy.create",
    targetTable: "leave_policies",
    targetRecordId: leavePolicyId,
    newValues: input,
  });

  return {
    success: true,
    message: "Leave policy created successfully.",
    data: { leavePolicyId },
    correlationId: ctx.correlationId,
  };
}

export interface AssignLeavePolicyInput {
  tenantId: UUID;
  entityId: UUID;
  leavePolicyId: UUID;
  financePersonId: UUID;
  effectiveStartDate: string;
  effectiveEndDate?: string;
}

export async function assignLeavePolicy(
  db: DbClient,
  ctx: ActionContext,
  input: AssignLeavePolicyInput,
): Promise<ActionResult<{ assignmentId: UUID }>> {
  requirePermission(ctx, "leave.policy.manage");
  requireEntityScope(ctx, input.entityId);

  const result = await db.transaction(async (tx) => {
    const assignment = await tx.query<{ id: UUID }>(
      `
      insert into public.leave_policy_assignments (
        tenant_id, entity_id, leave_policy_id, finance_person_id,
        assignment_status, effective_start_date, effective_end_date, assigned_by
      )
      values ($1,$2,$3,$4,'active',$5,$6,$7)
      returning id
      `,
      [
        input.tenantId,
        input.entityId,
        input.leavePolicyId,
        input.financePersonId,
        input.effectiveStartDate,
        input.effectiveEndDate ?? null,
        ctx.platformUserId,
      ],
    );

    const leaveType = await tx.query<{ leave_type_id: UUID }>(
      `select leave_type_id from public.leave_policies where id = $1`,
      [input.leavePolicyId],
    );

    if (!leaveType.rows.length) {
      throw new Error("not_found:leave_policy");
    }

    await tx.query(
      `
      insert into public.employee_leave_profiles (
        tenant_id, entity_id, finance_person_id, leave_type_id,
        current_balance_hours, available_balance_hours, pending_balance_hours, ytd_used_hours, status
      )
      values ($1,$2,$3,$4,0,0,0,0,'active')
      on conflict (finance_person_id, leave_type_id) do nothing
      `,
      [input.tenantId, input.entityId, input.financePersonId, leaveType.rows[0].leave_type_id],
    );

    return assignment.rows[0].id;
  });

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    entityId: input.entityId,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "leave",
    actionCode: "leave.policy.assign",
    targetTable: "leave_policy_assignments",
    targetRecordId: result,
    newValues: input,
  });

  return {
    success: true,
    message: "Leave policy assigned successfully.",
    data: { assignmentId: result },
    correlationId: ctx.correlationId,
  };
}

export interface SubmitLeaveRequestInput {
  tenantId: UUID;
  entityId: UUID;
  financePersonId: UUID;
  leaveTypeId: UUID;
  requestStartDate: string;
  requestEndDate: string;
  days: Array<{ requestDate: string; requestedHours: number }>;
  employeeNotes?: string;
}

export async function submitLeaveRequest(
  db: DbClient,
  ctx: ActionContext,
  input: SubmitLeaveRequestInput,
): Promise<ActionResult<{ leaveRequestId: UUID }>> {
  requirePermission(ctx, "leave.request.create");
  requireEntityScope(ctx, input.entityId);

  return db.transaction(async (tx) => {
    const totalRequestedHours = Number(
      input.days.reduce((sum, day) => sum + day.requestedHours, 0).toFixed(2)
    );

    const request = await tx.query<{ id: UUID }>(
      `
      insert into public.leave_requests (
        tenant_id, entity_id, finance_person_id, leave_type_id, request_status,
        request_start_date, request_end_date, total_requested_hours, total_approved_hours,
        employee_notes, submitted_at, created_by
      )
      values ($1,$2,$3,$4,'submitted',$5,$6,$7,0,$8,timezone('utc', now()),$9)
      returning id
      `,
      [
        input.tenantId,
        input.entityId,
        input.financePersonId,
        input.leaveTypeId,
        input.requestStartDate,
        input.requestEndDate,
        totalRequestedHours,
        input.employeeNotes ?? null,
        ctx.platformUserId,
      ],
    );

    const leaveRequestId = request.rows[0].id;

    for (const [index, day] of input.days.entries()) {
      await tx.query(
        `
        insert into public.leave_request_days (
          tenant_id, leave_request_id, request_date, requested_hours, approved_hours, day_status
        )
        values ($1,$2,$3,$4,0,'requested')
        `,
        [input.tenantId, leaveRequestId, day.requestDate, day.requestedHours],
      );
    }

    await writeAuditLog(tx, {
      tenantId: input.tenantId,
      entityId: input.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "leave",
      actionCode: "leave.request.submit",
      targetTable: "leave_requests",
      targetRecordId: leaveRequestId,
      newValues: input,
    });

    return {
      success: true,
      message: "Leave request submitted successfully.",
      data: { leaveRequestId },
      correlationId: ctx.correlationId,
    };
  });
}

export interface ApproveLeaveRequestInput {
  tenantId: UUID;
  entityId: UUID;
  leaveRequestId: UUID;
  approvedDays?: Array<{ requestDate: string; approvedHours: number }>;
  approvalNotes?: string;
}

export async function approveLeaveRequest(
  db: DbClient,
  ctx: ActionContext,
  input: ApproveLeaveRequestInput,
): Promise<ActionResult<{ leaveRequestId: UUID; totalApprovedHours: number }>> {
  requirePermission(ctx, "leave.request.approve");
  requireEntityScope(ctx, input.entityId);

  return db.transaction(async (tx) => {
    if (input.approvedDays?.length) {
      for (const day of input.approvedDays) {
        await tx.query(
          `
          update public.leave_request_days
          set approved_hours = $1,
              day_status = case when $1 > 0 then 'approved' else 'rejected' end
          where leave_request_id = $2 and request_date = $3
          `,
          [day.approvedHours, input.leaveRequestId, day.requestDate],
        )
      }

      const totals = await tx.query<{ total_approved: number }>(
        `
        select coalesce(sum(approved_hours), 0)::numeric as total_approved
        from public.leave_request_days
        where leave_request_id = $1
        `,
        [input.leaveRequestId],
      );

      const totalApprovedHours = Number(totals.rows[0]?.total_approved ?? 0);

      await tx.query(
        `
        update public.leave_requests
        set request_status = 'approved',
            total_approved_hours = $1,
            manager_notes = $2
        where id = $3 and tenant_id = $4 and entity_id = $5
        `,
        [totalApprovedHours, input.approvalNotes ?? null, input.leaveRequestId, input.tenantId, input.entityId],
      );

      await tx.query(
        `
        insert into public.leave_approvals (
          tenant_id, entity_id, leave_request_id, approval_step, approval_status,
          approver_platform_user_id, approval_notes
        )
        values ($1,$2,$3,'manager','approved',$4,$5)
        `,
        [input.tenantId, input.entityId, input.leaveRequestId, ctx.platformUserId, input.approvalNotes ?? null],
      );

      await writeAuditLog(tx, {
        tenantId: input.tenantId,
        entityId: input.entityId,
        actorPlatformUserId: ctx.platformUserId,
        moduleKey: "leave",
        actionCode: "leave.request.approve",
        targetTable: "leave_requests",
        targetRecordId: input.leaveRequestId,
        metadata: { totalApprovedHours, approvedDays: input.approvedDays ?? [] },
      });

      return {
        success: true,
        message: "Leave request approved successfully.",
        data: { leaveRequestId: input.leaveRequestId, totalApprovedHours },
        correlationId: ctx.correlationId,
      };
    }

    const requestRes = await tx.query<{
      finance_person_id: UUID;
      leave_type_id: UUID;
      total_requested_hours: number;
    }>(
      `
      select finance_person_id, leave_type_id, total_requested_hours
      from public.leave_requests
      where id = $1 and tenant_id = $2 and entity_id = $3
      `,
      [input.leaveRequestId, input.tenantId, input.entityId],
    );

    if (!requestRes.rows.length) throw new Error("not_found:leave_request");

    const req = requestRes.rows[0];
    const totalApprovedHours = Number(req.total_requested_hours ?? 0);

    await tx.query(
      `
      update public.leave_request_days
      set approved_hours = requested_hours,
          day_status = 'approved'
      where leave_request_id = $1
      `,
      [input.leaveRequestId],
    );

    await tx.query(
      `
      update public.leave_requests
      set request_status = 'approved',
          total_approved_hours = $1,
          manager_notes = $2
      where id = $3
      `,
      [totalApprovedHours, input.approvalNotes ?? null, input.leaveRequestId],
    );

    await tx.query(
      `
      insert into public.leave_approvals (
        tenant_id, entity_id, leave_request_id, approval_step, approval_status,
        approver_platform_user_id, approval_notes
        ) values ($1,$2,$3,'manager','approved',$4,$5)
      `,
      [input.tenantId, input.entityId, input.leaveRequestId, ctx.platformUserId, input.approvalNotes ?? null],
    );

    await writeAuditLog(tx, {
      tenantId: input.tenantId,
      entityId: input.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "leave",
      actionCode: "leave.request.approve",
      targetTable: "leave_requests",
      targetRecordId: input.leaveRequestId,
      metadata: { totalApprovedHours },
    });

    return {
      success: true,
      message: "Leave request approved successfully.",
      data: { leaveRequestId: input.leaveRequestId, totalApprovedHours },
      correlationId: ctx.correlationId,
    };
  });
}

export interface RunLeaveAccrualsInput {
  tenantId: UUID;
  entityId: UUID;
  asOfDate: string;
}

export async function runLeaveAccruals(
  db: DbClient,
  ctx: ActionContext,
  input: RunLeaveAccrualsInput,
): Promise<ActionResult<{ processedProfiles: number }>> {
  requirePermission(ctx, "leave.accrual.run");
  requireEntityScope(ctx, input.entityId);

  return db.transaction(async (tx) => {
    const profiles = await tx.query<{
      profile_id: UUID;
      finance_person_id: UUID;
      leave_type_id: UUID;
      accrual_hours: number | null;
      current_balance_hours: number;
    }>(
      `
      select
        elp.id as profile_id,
        elp.finance_person_id,
        elp.leave_type_id,
        lp.accrual_rate as accrual_hours,
        elp.current_balance_hours
      from public.employee_leave_profiles elp
      join public.leave_policy_assignments lpa
        on lpa.finance_person_id = elp.finance_person_id
       and lpa.tenant_id = elp.tenant_id
       and lpa.entity_id = elp.entity_id
       and lpa.assignment_status = 'active'
      join public.leave_policies lp
        on lp.id = lpa.leave_policy_id
      where elp.tenant_id = $1
        and elp.entity_id = $2
        and elp.status = 'active'
      `,
      [input.tenantId, input.entityId],
    );

    let processedProfiles = 0;

    for (const profile of profiles.rows) {
      const accrualHours = Number(profile.accrual_hours ?? 0);
      if (!accrualHours) {
        continue
      }

      const newBalance = Number((Number(profile.current_balance_hours) + accrualHours).toFixed(2));

      await tx.query(
        `
        update public.employee_leave_profiles
        set current_balance_hours = $1,
            available_balance_hours = $1,
            last_accrual_at = timezone('utc', now())
        where id = $2
        `,
        [newBalance, profile.profile_id],
      );

      await tx.query(
        `
        insert into public.leave_balance_ledgers (
          tenant_id, entity_id, employee_leave_profile_id, finance_person_id, leave_type_id,
          entry_type, entry_date, hours_delta, balance_after_hours, source_type, notes, created_by
        )
        values ($1,$2,$3,$4,$5,'accrual',$6,$7,$8,'scheduled_accrual','Accrual run',$9)
        `,
        [
          input.tenantId,
          input.entityId,
          profile.profile_id,
          profile.finance_person_id,
          profile.leave_type_id,
          input.asOfDate,
          accrualHours,
          newBalance,
          ctx.platformUserId,
        ],
      );

      processedProfiles += 1

    }

    await writeAuditLog(tx, {
      tenantId: input.tenantId,
      entityId: input.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "leave",
      actionCode: "leave.accrual.run",
      targetTable: "employee_leave_profiles",
      metadata: { asOfDate: input.asOfDate, processedProfiles },
    });

    return {
      success: true,
      message: "Leave accrual run completed successfully.",
      data: { processedProfiles },
      correlationId: ctx.correlationId,
    };
  });
}
