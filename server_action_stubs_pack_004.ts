/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

// Watchman Finance Server Action Starter Pack 004 v1
// Payroll core action stubs.

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

export interface CreatePayGroupInput {
  tenantId: UUID;
  entityId: UUID;
  groupCode: string;
  groupName: string;
  payFrequency: "weekly" | "biweekly" | "semimonthly" | "monthly" | "off_cycle";
  payScheduleAnchorDate?: string;
}

export async function createPayGroup(
  db: DbClient,
  ctx: ActionContext,
  input: CreatePayGroupInput,
): Promise<ActionResult<{ payGroupId: UUID }>> {
  requirePermission(ctx, "payroll.profile.manage");
  requireEntityScope(ctx, input.entityId);

  const result = await db.query<{ id: UUID }>(
    `
    insert into public.pay_groups (
      tenant_id, entity_id, group_code, group_name, pay_frequency, pay_schedule_anchor_date, status
    )
    values ($1,$2,$3,$4,$5,$6,'active')
    returning id
    `,
    [
      input.tenantId,
      input.entityId,
      input.groupCode,
      input.groupName,
      input.payFrequency,
      input.payScheduleAnchorDate ?? null,
    ],
  );

  const payGroupId = result.rows[0].id;

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    entityId: input.entityId,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "payroll",
    actionCode: "payroll.pay_group.create",
    targetTable: "pay_groups",
    targetRecordId: payGroupId,
    newValues: input,
  });

  return {
    success: true,
    message: "Pay group created successfully.",
    data: { payGroupId },
    correlationId: ctx.correlationId,
  };
}

export interface CreatePayProfileInput {
  tenantId: UUID;
  entityId: UUID;
  financePersonId: UUID;
  payGroupId?: UUID;
  employeeNumber?: string;
  payType: "hourly" | "salary";
  baseRate?: number;
  annualSalary?: number;
  overtimeEligible?: boolean;
  effectiveStartDate?: string;
}

export async function createPayProfile(
  db: DbClient,
  ctx: ActionContext,
  input: CreatePayProfileInput,
): Promise<ActionResult<{ employeePayProfileId: UUID }>> {
  requirePermission(ctx, "payroll.profile.manage");
  requireEntityScope(ctx, input.entityId);

  const result = await db.query<{ id: UUID }>(
    `
    insert into public.employee_pay_profiles (
      tenant_id, entity_id, finance_person_id, pay_group_id, employee_number,
      worker_type, pay_type, base_rate, annual_salary, overtime_eligible,
      payroll_status, effective_start_date
    )
    values ($1,$2,$3,$4,$5,'employee',$6,$7,$8,$9,'active',$10)
    returning id
    `,
    [
      input.tenantId,
      input.entityId,
      input.financePersonId,
      input.payGroupId ?? null,
      input.employeeNumber ?? null,
      input.payType,
      input.baseRate ?? null,
      input.annualSalary ?? null,
      input.overtimeEligible ?? true,
      input.effectiveStartDate ?? null,
    ],
  );

  const employeePayProfileId = result.rows[0].id;

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    entityId: input.entityId,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "payroll",
    actionCode: "payroll.profile.create",
    targetTable: "employee_pay_profiles",
    targetRecordId: employeePayProfileId,
    newValues: input,
  });

  return {
    success: true,
    message: "Employee pay profile created successfully.",
    data: { employeePayProfileId },
    correlationId: ctx.correlationId,
  };
}

export interface CreatePayrollRunInput {
  tenantId: UUID;
  entityId: UUID;
  payGroupId: UUID;
  payPeriodId?: UUID;
  runNumber: string;
  runType?: "regular" | "off_cycle" | "adjustment";
  payDate?: string;
  periodStart?: string;
  periodEnd?: string;
}

export async function createPayrollRun(
  db: DbClient,
  ctx: ActionContext,
  input: CreatePayrollRunInput,
): Promise<ActionResult<{ payrollRunId: UUID }>> {
  requirePermission(ctx, "payroll.run.create");
  requireEntityScope(ctx, input.entityId);

  const result = await db.query<{ id: UUID }>(
    `
    insert into public.payroll_runs (
      tenant_id, entity_id, pay_group_id, pay_period_id, run_number, run_type,
      run_status, pay_date, period_start, period_end, created_by
    )
    values ($1,$2,$3,$4,$5,$6,'draft',$7,$8,$9,$10)
    returning id
    `,
    [
      input.tenantId,
      input.entityId,
      input.payGroupId,
      input.payPeriodId ?? null,
      input.runNumber,
      input.runType ?? "regular",
      input.payDate ?? null,
      input.periodStart ?? null,
      input.periodEnd ?? null,
      ctx.platformUserId,
    ],
  );

  const payrollRunId = result.rows[0].id;

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    entityId: input.entityId,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "payroll",
    actionCode: "payroll.run.create",
    targetTable: "payroll_runs",
    targetRecordId: payrollRunId,
    newValues: input,
  });

  return {
    success: true,
    message: "Payroll run created successfully.",
    data: { payrollRunId },
    correlationId: ctx.correlationId,
  };
}

export interface LoadApprovedTimeInput {
  tenantId: UUID;
  entityId: UUID;
  payrollRunId: UUID;
}

export async function loadApprovedTime(
  db: DbClient,
  ctx: ActionContext,
  input: LoadApprovedTimeInput,
): Promise<ActionResult<{ insertedCount: number }>> {
  requirePermission(ctx, "payroll.run.calculate");
  requireEntityScope(ctx, input.entityId);

  const inserted = await db.query<{ count: number }>(
    `
    with src as (
      select
        ste.tenant_id,
        ste.entity_id,
        fp.id as finance_person_id,
        ste.source_record_id,
        ste.pay_period_start,
        coalesce(sum(sph.regular_hours), 0) as regular_hours,
        coalesce(sum(sph.overtime_hours), 0) as overtime_hours,
        coalesce(sum(sph.holiday_hours), 0) as holiday_hours,
        coalesce(sum(sph.unpaid_hours), 0) as unpaid_hours
      from public.staged_time_entries ste
      left join public.staged_payroll_hours sph on sph.staged_time_entry_id = ste.id
      left join public.finance_people fp
        on fp.tenant_id = ste.tenant_id
       and fp.source_system_key = 'watchman_launch'
       and fp.source_record_id = ste.employee_source_record_id
      where ste.tenant_id = $1
        and ste.entity_id = $2
        and ste.approval_status = 'approved'
        and ste.validation_status in ('pending', 'valid')
      group by ste.tenant_id, ste.entity_id, fp.id, ste.source_record_id, ste.pay_period_start
    ),
    ins as (
      insert into public.payroll_input_records (
        tenant_id, entity_id, payroll_run_id, finance_person_id, source_type,
        source_table, source_record_id, work_date, hours_regular, hours_overtime,
        hours_holiday, hours_unpaid, validation_status
      )
      select
        tenant_id, entity_id, $3, finance_person_id, 'approved_time',
        'staged_time_entries', source_record_id, pay_period_start, regular_hours,
        overtime_hours, holiday_hours, unpaid_hours, 'valid'
      from src
      where finance_person_id is not null
      returning 1
    )
    select count(*)::int as count from ins
    `,
    [input.tenantId, input.entityId, input.payrollRunId],
  );

  const insertedCount = inserted.rows[0]?.count ?? 0;

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    entityId: input.entityId,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "payroll",
    actionCode: "payroll.run.load_approved_time",
    targetTable: "payroll_input_records",
    metadata: input,
  });

  return {
    success: true,
    message: "Approved time loaded into payroll inputs.",
    data: { insertedCount },
    correlationId: ctx.correlationId,
  };
}

export interface CalculatePayrollRunInput {
  tenantId: UUID;
  entityId: UUID;
  payrollRunId: UUID;
}

export async function calculatePayrollRun(
  db: DbClient,
  ctx: ActionContext,
  input: CalculatePayrollRunInput,
): Promise<ActionResult<{ payrollRunId: UUID; itemCount: number }>> {
  requirePermission(ctx, "payroll.run.calculate");
  requireEntityScope(ctx, input.entityId);

  return db.transaction(async (tx) => {
    await tx.query(
      `update public.payroll_runs set run_status = 'calculating' where id = $1 and tenant_id = $2 and entity_id = $3`,
      [input.payrollRunId, input.tenantId, input.entityId],
    );

    await tx.query(
      `
      delete from public.payroll_run_items
      where payroll_run_id = $1 and tenant_id = $2 and entity_id = $3
      `,
      [input.payrollRunId, input.tenantId, input.entityId],
    );

    const calc = await tx.query<{ count: number }>(
      `
      with src as (
        select
          pir.tenant_id,
          pir.entity_id,
          pir.payroll_run_id,
          pir.finance_person_id,
          epp.id as employee_pay_profile_id,
          epp.base_rate,
          sum(pir.hours_regular) as regular_hours,
          sum(pir.hours_overtime) as overtime_hours,
          sum(pir.hours_holiday) as holiday_hours,
          sum(pir.hours_unpaid) as unpaid_hours
        from public.payroll_input_records pir
        join public.employee_pay_profiles epp
          on epp.finance_person_id = pir.finance_person_id
         and epp.tenant_id = pir.tenant_id
        where pir.payroll_run_id = $1
          and pir.tenant_id = $2
          and pir.entity_id = $3
        group by pir.tenant_id, pir.entity_id, pir.payroll_run_id, pir.finance_person_id, epp.id, epp.base_rate
      ),
      ins as (
        insert into public.payroll_run_items (
          tenant_id, entity_id, payroll_run_id, finance_person_id, employee_pay_profile_id,
          item_status, regular_hours, overtime_hours, holiday_hours, unpaid_hours,
          gross_pay, employee_taxes, employer_taxes, deductions_total, net_pay
        )
        select
          tenant_id, entity_id, payroll_run_id, finance_person_id, employee_pay_profile_id,
          'calculated',
          regular_hours,
          overtime_hours,
          holiday_hours,
          unpaid_hours,
          round(coalesce(regular_hours,0) * coalesce(base_rate,0)
              + coalesce(overtime_hours,0) * coalesce(base_rate,0) * 1.5
              + coalesce(holiday_hours,0) * coalesce(base_rate,0), 2) as gross_pay,
          0, 0, 0,
          round(coalesce(regular_hours,0) * coalesce(base_rate,0)
              + coalesce(overtime_hours,0) * coalesce(base_rate,0) * 1.5
              + coalesce(holiday_hours,0) * coalesce(base_rate,0), 2) as net_pay
        from src
        returning 1
      )
      select count(*)::int as count from ins
      `,
      [input.payrollRunId, input.tenantId, input.entityId],
    );

    const itemCount = calc.rows[0]?.count ?? 0;

    await tx.query(
      `
      update public.payroll_runs pr
      set run_status = 'review',
          total_gross = coalesce((
            select sum(pri.gross_pay) from public.payroll_run_items pri where pri.payroll_run_id = pr.id
          ), 0),
          total_net = coalesce((
            select sum(pri.net_pay) from public.payroll_run_items pri where pri.payroll_run_id = pr.id
          ), 0),
          total_employee_taxes = coalesce((
            select sum(pri.employee_taxes) from public.payroll_run_items pri where pri.payroll_run_id = pr.id
          ), 0),
          total_employer_taxes = coalesce((
            select sum(pri.employer_taxes) from public.payroll_run_items pri where pri.payroll_run_id = pr.id
          ), 0),
          total_deductions = coalesce((
            select sum(pri.deductions_total) from public.payroll_run_items pri where pri.payroll_run_id = pr.id
          ), 0)
      where pr.id = $1 and pr.tenant_id = $2 and pr.entity_id = $3
      `,
      [input.payrollRunId, input.tenantId, input.entityId],
    );

    await tx.query(
      `
      insert into public.payroll_approval_logs (
        tenant_id, entity_id, payroll_run_id, action_code, actor_platform_user_id, action_notes
      )
      values ($1,$2,$3,'calculated',$4,'Payroll run calculated')
      `,
      [input.tenantId, input.entityId, input.payrollRunId, ctx.platformUserId],
    );

    await writeAuditLog(tx, {
      tenantId: input.tenantId,
      entityId: input.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "payroll",
      actionCode: "payroll.run.calculate",
      targetTable: "payroll_runs",
      targetRecordId: input.payrollRunId,
      metadata: { itemCount },
    });

    return {
      success: true,
      message: "Payroll run calculated successfully.",
      data: { payrollRunId: input.payrollRunId, itemCount },
      correlationId: ctx.correlationId,
    };
  });
}

export interface ApprovePayrollRunInput {
  tenantId: UUID;
  entityId: UUID;
  payrollRunId: UUID;
  actionNotes?: string;
}

export async function approvePayrollRun(
  db: DbClient,
  ctx: ActionContext,
  input: ApprovePayrollRunInput,
): Promise<ActionResult<{ payrollRunId: UUID }>> {
  requirePermission(ctx, "payroll.run.approve");
  requireEntityScope(ctx, input.entityId);

  await db.query(
    `
    update public.payroll_runs
    set run_status = 'approved',
        approved_by = $1,
        approved_at = timezone('utc', now())
    where id = $2 and tenant_id = $3 and entity_id = $4 and run_status = 'review'
    `,
    [ctx.platformUserId, input.payrollRunId, input.tenantId, input.entityId],
  );

  await db.query(
    `
    insert into public.payroll_approval_logs (
      tenant_id, entity_id, payroll_run_id, action_code, actor_platform_user_id, action_notes
    )
    values ($1,$2,$3,'approved',$4,$5)
    `,
    [input.tenantId, input.entityId, input.payrollRunId, ctx.platformUserId, input.actionNotes ?? null],
  );

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    entityId: input.entityId,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "payroll",
    actionCode: "payroll.run.approve",
    targetTable: "payroll_runs",
    targetRecordId: input.payrollRunId,
    metadata: input,
  });

  return {
    success: true,
    message: "Payroll run approved successfully.",
    data: { payrollRunId: input.payrollRunId },
    correlationId: ctx.correlationId,
  };
}

export interface FinalizePayrollRunInput {
  tenantId: UUID;
  entityId: UUID;
  payrollRunId: UUID;
}

export async function finalizePayrollRun(
  db: DbClient,
  ctx: ActionContext,
  input: FinalizePayrollRunInput,
): Promise<ActionResult<{ payrollRunId: UUID; statementsGenerated: number }>> {
  requirePermission(ctx, "payroll.run.finalize");
  requireEntityScope(ctx, input.entityId);

  return db.transaction(async (tx) => {
    await tx.query(
      `
      update public.payroll_runs
      set run_status = 'finalized',
          finalized_by = $1,
          finalized_at = timezone('utc', now())
      where id = $2 and tenant_id = $3 and entity_id = $4 and run_status = 'approved'
      `,
      [ctx.platformUserId, input.payrollRunId, input.tenantId, input.entityId],
    );

    const statements = await tx.query<{ count: number }>(
      `
      with ins as (
        insert into public.pay_statements (
          tenant_id, entity_id, payroll_run_item_id, finance_person_id, statement_status,
          statement_date, gross_pay, net_pay, ytd_gross, ytd_net
        )
        select
          pri.tenant_id,
          pri.entity_id,
          pri.id,
          pri.finance_person_id,
          'generated',
          current_date,
          pri.gross_pay,
          pri.net_pay,
          pri.gross_pay,
          pri.net_pay
        from public.payroll_run_items pri
        where pri.payroll_run_id = $1
        returning 1
      )
      select count(*)::int as count from ins
      `,
      [input.payrollRunId],
    );

    const statementsGenerated = statements.rows[0]?.count ?? 0

    await tx.query(
      `
      insert into public.payroll_approval_logs (
        tenant_id, entity_id, payroll_run_id, action_code, actor_platform_user_id, action_notes
      )
      values ($1,$2,$3,'finalized',$4,'Payroll run finalized')
      `,
      [input.tenantId, input.entityId, input.payrollRunId, ctx.platformUserId],
    );

    await writeAuditLog(tx, {
      tenantId: input.tenantId,
      entityId: input.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "payroll",
      actionCode: "payroll.run.finalize",
      targetTable: "payroll_runs",
      targetRecordId: input.payrollRunId,
      metadata: { statementsGenerated },
    });

    return {
      success: true,
      message: "Payroll run finalized successfully.",
      data: { payrollRunId: input.payrollRunId, statementsGenerated },
      correlationId: ctx.correlationId,
    };
  });
}
