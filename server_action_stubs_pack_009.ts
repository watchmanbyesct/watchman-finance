/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

// Watchman Finance Server Action Starter Pack 009 v1
// Reporting, dashboard, and close-management foundation stubs.

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

export function requireEntityScope(ctx: ActionContext, entityId?: UUID | null): void {
  if (entityId && !ctx.entityIds.includes(entityId)) {
    throw new Error(`entity_scope_mismatch:${entityId}`);
  }
}

export interface CreateReportDefinitionInput {
  tenantId: UUID;
  entityId?: UUID;
  reportCode: string;
  reportName: string;
  reportCategory:
    | "financial_statement" | "ar" | "ap" | "payroll" | "leave"
    | "banking" | "billing" | "inventory" | "executive" | "other";
  outputType?: "table" | "snapshot" | "chart" | "kpi";
  config?: Record<string, unknown>;
}

export async function createReportDefinition(
  db: DbClient,
  ctx: ActionContext,
  input: CreateReportDefinitionInput,
): Promise<ActionResult<{ reportDefinitionId: UUID }>> {
  requirePermission(ctx, "report.design");
  requireEntityScope(ctx, input.entityId ?? null);

  const result = await db.query<{ id: UUID }>(
    `
    insert into public.report_definitions (
      tenant_id, entity_id, report_code, report_name, report_category,
      output_type, status, config_json
    )
    values ($1,$2,$3,$4,$5,$6,'active',$7::jsonb)
    returning id
    `,
    [
      input.tenantId,
      input.entityId ?? null,
      input.reportCode,
      input.reportName,
      input.reportCategory,
      input.outputType ?? "table",
      JSON.stringify(input.config ?? {}),
    ],
  );

  const reportDefinitionId = result.rows[0].id;

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    entityId: input.entityId ?? undefined,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "reporting",
    actionCode: "report.definition.create",
    targetTable: "report_definitions",
    targetRecordId: reportDefinitionId,
    newValues: input,
  });

  return {
    success: true,
    message: "Report definition created successfully.",
    data: { reportDefinitionId },
    correlationId: ctx.correlationId,
  };
}

export interface GenerateReportSnapshotInput {
  tenantId: UUID;
  entityId?: UUID;
  reportDefinitionId: UUID;
  snapshotDate: string;
  reportCode: "ar_aging" | "ap_aging" | "payroll_summary" | "leave_summary" | "cash_position" | "inventory_position" | "billing_candidates";
}

export async function generateReportSnapshot(
  db: DbClient,
  ctx: ActionContext,
  input: GenerateReportSnapshotInput,
): Promise<ActionResult<{ reportSnapshotId: UUID }>> {
  requirePermission(ctx, "report.read_standard");
  requireEntityScope(ctx, input.entityId ?? null);

  return db.transaction(async (tx) => {
    let snapshotJson: unknown = {};

    const viewMap: Record<string, string> = {
      ar_aging: "public.v_ar_aging_summary",
      ap_aging: "public.v_ap_aging_summary",
      payroll_summary: "public.v_payroll_run_summary",
      leave_summary: "public.v_leave_balance_summary",
      cash_position: "public.v_bank_cash_position",
      inventory_position: "public.v_inventory_position",
      billing_candidates: "public.v_billable_candidate_summary",
    };

    const viewName = viewMap[input.reportCode];
    if (!viewName) {
      throw new Error(`unsupported_report:${input.reportCode}`);
    }

    const rows = await tx.query(
      `
      select jsonb_agg(t) as payload
      from (
        select * from ${viewName}
        where tenant_id = $1
          and ($2::uuid is null or entity_id = $2)
      ) t
      `,
      [input.tenantId, input.entityId ?? null],
    );

    snapshotJson = rows.rows[0]?.payload ?? [];

    const insert = await tx.query<{ id: UUID }>(
      `
      insert into public.report_snapshots (
        tenant_id, entity_id, report_definition_id, snapshot_date,
        snapshot_status, snapshot_json, generated_by
      )
      values ($1,$2,$3,$4,'generated',$5::jsonb,$6)
      on conflict (report_definition_id, snapshot_date)
      do update set
        snapshot_status = 'generated',
        snapshot_json = excluded.snapshot_json,
        generated_by = excluded.generated_by,
        generated_at = timezone('utc', now())
      returning id
      `,
      [
        input.tenantId,
        input.entityId ?? null,
        input.reportDefinitionId,
        input.snapshotDate,
        JSON.stringify(snapshotJson),
        ctx.platformUserId,
      ],
    );

    const reportSnapshotId = insert.rows[0].id;

    await writeAuditLog(tx, {
      tenantId: input.tenantId,
      entityId: input.entityId ?? undefined,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "reporting",
      actionCode: "report.snapshot.generate",
      targetTable: "report_snapshots",
      targetRecordId: reportSnapshotId,
      metadata: { reportCode: input.reportCode, snapshotDate: input.snapshotDate },
    });

    return {
      success: true,
      message: "Report snapshot generated successfully.",
      data: { reportSnapshotId },
      correlationId: ctx.correlationId,
    };
  });
}

export interface GenerateDashboardSnapshotInput {
  tenantId: UUID;
  entityId?: UUID;
  dashboardDefinitionId: UUID;
  snapshotDate: string;
}

export async function generateExecutiveDashboardSnapshot(
  db: DbClient,
  ctx: ActionContext,
  input: GenerateDashboardSnapshotInput,
): Promise<ActionResult<{ dashboardSnapshotId: UUID }>> {
  requirePermission(ctx, "report.read_sensitive");
  requireEntityScope(ctx, input.entityId ?? null);

  return db.transaction(async (tx) => {
    const ar = await tx.query(`select coalesce(sum(total_balance_due),0) as ar_total from public.v_ar_aging_summary where tenant_id = $1 and ($2::uuid is null or entity_id = $2)`, [input.tenantId, input.entityId ?? null]);
    const ap = await tx.query(`select coalesce(sum(total_balance_due),0) as ap_total from public.v_ap_aging_summary where tenant_id = $1 and ($2::uuid is null or entity_id = $2)`, [input.tenantId, input.entityId ?? null]);
    const cash = await tx.query(`select coalesce(sum(ledger_balance),0) as cash_total from public.v_bank_cash_position where tenant_id = $1 and ($2::uuid is null or entity_id = $2)`, [input.tenantId, input.entityId ?? null]);
    const payroll = await tx.query(`select coalesce(sum(total_gross),0) as payroll_gross from public.v_payroll_run_summary where tenant_id = $1 and ($2::uuid is null or entity_id = $2)`, [input.tenantId, input.entityId ?? null]);

    const snapshotJson = {
      arTotal: ar.rows[0]?.ar_total ?? 0,
      apTotal: ap.rows[0]?.ap_total ?? 0,
      cashTotal: cash.rows[0]?.cash_total ?? 0,
      payrollGross: payroll.rows[0]?.payroll_gross ?? 0,
    };

    const insert = await tx.query<{ id: UUID }>(
      `
      insert into public.dashboard_snapshots (
        tenant_id, entity_id, dashboard_definition_id, snapshot_date,
        snapshot_status, snapshot_json, generated_by
      )
      values ($1,$2,$3,$4,'generated',$5::jsonb,$6)
      on conflict (dashboard_definition_id, snapshot_date)
      do update set
        snapshot_status = 'generated',
        snapshot_json = excluded.snapshot_json,
        generated_by = excluded.generated_by,
        generated_at = timezone('utc', now())
      returning id
      `,
      [
        input.tenantId,
        input.entityId ?? null,
        input.dashboardDefinitionId,
        input.snapshotDate,
        JSON.stringify(snapshotJson),
        ctx.platformUserId,
      ],
    );

    const dashboardSnapshotId = insert.rows[0].id;

    await writeAuditLog(tx, {
      tenantId: input.tenantId,
      entityId: input.entityId ?? undefined,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "reporting",
      actionCode: "dashboard.snapshot.generate",
      targetTable: "dashboard_snapshots",
      targetRecordId: dashboardSnapshotId,
      metadata: { snapshotDate: input.snapshotDate },
    });

    return {
      success: true,
      message: "Dashboard snapshot generated successfully.",
      data: { dashboardSnapshotId },
      correlationId: ctx.correlationId,
    };
  });
}

export interface CreateCloseChecklistInput {
  tenantId: UUID;
  entityId: UUID;
  checklistName: string;
  closePeriodStart?: string;
  closePeriodEnd?: string;
}

export async function createCloseChecklist(
  db: DbClient,
  ctx: ActionContext,
  input: CreateCloseChecklistInput,
): Promise<ActionResult<{ closeChecklistId: UUID }>> {
  requirePermission(ctx, "gl.period.close");
  requireEntityScope(ctx, input.entityId);

  const result = await db.query<{ id: UUID }>(
    `
    insert into public.close_checklists (
      tenant_id, entity_id, checklist_name, close_period_start, close_period_end,
      checklist_status, created_by
    )
    values ($1,$2,$3,$4,$5,'open',$6)
    returning id
    `,
    [
      input.tenantId,
      input.entityId,
      input.checklistName,
      input.closePeriodStart ?? null,
      input.closePeriodEnd ?? null,
      ctx.platformUserId,
    ],
  );

  const closeChecklistId = result.rows[0].id;

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    entityId: input.entityId,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "close",
    actionCode: "close.checklist.create",
    targetTable: "close_checklists",
    targetRecordId: closeChecklistId,
    newValues: input,
  });

  return {
    success: true,
    message: "Close checklist created successfully.",
    data: { closeChecklistId },
    correlationId: ctx.correlationId,
  };
}

export interface CompleteCloseTaskInput {
  tenantId: UUID;
  entityId: UUID;
  closeTaskId: UUID;
  notes?: string;
}

export async function completeCloseTask(
  db: DbClient,
  ctx: ActionContext,
  input: CompleteCloseTaskInput,
): Promise<ActionResult<{ closeTaskId: UUID }>> {
  requirePermission(ctx, "gl.period.close");
  requireEntityScope(ctx, input.entityId);

  await db.query(
    `
    update public.close_tasks
    set task_status = 'completed',
        completed_at = timezone('utc', now()),
        completed_by = $1,
        notes = coalesce(notes,'') || case when $2 is not null then E'\\n' || $2 else '' end
    where id = $3 and tenant_id = $4 and entity_id = $5
    `,
    [ctx.platformUserId, input.notes ?? null, input.closeTaskId, input.tenantId, input.entityId],
  );

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    entityId: input.entityId,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "close",
    actionCode: "close.task.complete",
    targetTable: "close_tasks",
    targetRecordId: input.closeTaskId,
    newValues: input,
  });

  return {
    success: true,
    message: "Close task completed successfully.",
    data: { closeTaskId: input.closeTaskId },
    correlationId: ctx.correlationId,
  };
}
