// Watchman Finance Server Action Starter Pack 010 v1
// Budgeting and forecasting action stubs.

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

export interface CreateBudgetVersionInput {
  tenantId: UUID;
  entityId: UUID;
  budgetCode: string;
  budgetName: string;
  fiscalYear: number;
  versionNumber?: number;
  notes?: string;
}

export async function createBudgetVersion(
  db: DbClient,
  ctx: ActionContext,
  input: CreateBudgetVersionInput,
): Promise<ActionResult<{ budgetVersionId: UUID }>> {
  requirePermission(ctx, "budget.create");
  requireEntityScope(ctx, input.entityId);

  const result = await db.query<{ id: UUID }>(
    `
    insert into public.budget_versions (
      tenant_id, entity_id, budget_code, budget_name, fiscal_year,
      budget_status, version_number, notes, created_by
    )
    values ($1,$2,$3,$4,$5,'draft',$6,$7,$8)
    returning id
    `,
    [
      input.tenantId,
      input.entityId,
      input.budgetCode,
      input.budgetName,
      input.fiscalYear,
      input.versionNumber ?? 1,
      input.notes ?? null,
      ctx.platformUserId,
    ],
  );

  const budgetVersionId = result.rows[0].id;

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    entityId: input.entityId,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "budgeting",
    actionCode: "budget.version.create",
    targetTable: "budget_versions",
    targetRecordId: budgetVersionId,
    newValues: input,
  });

  return {
    success: true,
    message: "Budget version created successfully.",
    data: { budgetVersionId },
    correlationId: ctx.correlationId,
  };
}

export interface UpsertBudgetLineInput {
  tenantId: UUID;
  entityId: UUID;
  budgetVersionId: UUID;
  accountId?: UUID;
  departmentId?: UUID;
  costCenterId?: UUID;
  lineMonth: number;
  amount: number;
  notes?: string;
}

export async function upsertBudgetLine(
  db: DbClient,
  ctx: ActionContext,
  input: UpsertBudgetLineInput,
): Promise<ActionResult<{ budgetLineId?: UUID }>> {
  requirePermission(ctx, "budget.edit");
  requireEntityScope(ctx, input.entityId);

  const result = await db.query<{ id: UUID }>(
    `
    insert into public.budget_lines (
      tenant_id, entity_id, budget_version_id, account_id, department_id,
      cost_center_id, line_month, amount, notes
    )
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    on conflict (
      budget_version_id,
      coalesce(account_id, '00000000-0000-0000-0000-000000000000'::uuid),
      coalesce(department_id, '00000000-0000-0000-0000-000000000000'::uuid),
      coalesce(cost_center_id, '00000000-0000-0000-0000-000000000000'::uuid),
      line_month
    )
    do update set
      amount = excluded.amount,
      notes = excluded.notes,
      updated_at = timezone('utc', now())
    returning id
    `,
    [
      input.tenantId,
      input.entityId,
      input.budgetVersionId,
      input.accountId ?? null,
      input.departmentId ?? null,
      input.costCenterId ?? null,
      input.lineMonth,
      input.amount,
      input.notes ?? null,
    ],
  );

  const budgetLineId = result.rows[0]?.id;

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    entityId: input.entityId,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "budgeting",
    actionCode: "budget.line.upsert",
    targetTable: "budget_lines",
    targetRecordId: budgetLineId,
    newValues: input,
  });

  return {
    success: true,
    message: "Budget line saved successfully.",
    data: { budgetLineId },
    correlationId: ctx.correlationId,
  };
}

export interface SubmitBudgetVersionInput {
  tenantId: UUID;
  entityId: UUID;
  budgetVersionId: UUID;
}

export async function submitBudgetVersion(
  db: DbClient,
  ctx: ActionContext,
  input: SubmitBudgetVersionInput,
): Promise<ActionResult<{ budgetVersionId: UUID }>> {
  requirePermission(ctx, "budget.submit");
  requireEntityScope(ctx, input.entityId);

  await db.query(
    `
    update public.budget_versions
    set budget_status = 'submitted',
        submitted_by = $1,
        submitted_at = timezone('utc', now())
    where id = $2 and tenant_id = $3 and entity_id = $4 and budget_status = 'draft'
    `,
    [ctx.platformUserId, input.budgetVersionId, input.tenantId, input.entityId],
  );

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    entityId: input.entityId,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "budgeting",
    actionCode: "budget.version.submit",
    targetTable: "budget_versions",
    targetRecordId: input.budgetVersionId,
    newValues: input,
  });

  return {
    success: true,
    message: "Budget version submitted successfully.",
    data: { budgetVersionId: input.budgetVersionId },
    correlationId: ctx.correlationId,
  };
}

export interface ApproveBudgetVersionInput {
  tenantId: UUID;
  entityId: UUID;
  budgetVersionId: UUID;
  approvalNotes?: string;
}

export async function approveBudgetVersion(
  db: DbClient,
  ctx: ActionContext,
  input: ApproveBudgetVersionInput,
): Promise<ActionResult<{ budgetVersionId: UUID }>> {
  requirePermission(ctx, "budget.approve");
  requireEntityScope(ctx, input.entityId);

  return db.transaction(async (tx) => {
    await tx.query(
      `
      update public.budget_versions
      set budget_status = 'approved',
          approved_by = $1,
          approved_at = timezone('utc', now())
      where id = $2 and tenant_id = $3 and entity_id = $4 and budget_status = 'submitted'
      `,
      [ctx.platformUserId, input.budgetVersionId, input.tenantId, input.entityId],
    );

    await tx.query(
      `
      insert into public.budget_approvals (
        tenant_id, entity_id, budget_version_id, approval_step,
        approval_status, approver_platform_user_id, approval_notes
      )
      values ($1,$2,$3,'finance','approved',$4,$5)
      `,
      [input.tenantId, input.entityId, input.budgetVersionId, ctx.platformUserId, input.approvalNotes ?? null],
    );

    await writeAuditLog(tx, {
      tenantId: input.tenantId,
      entityId: input.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "budgeting",
      actionCode: "budget.version.approve",
      targetTable: "budget_versions",
      targetRecordId: input.budgetVersionId,
      newValues: input,
    });

    return {
      success: true,
      message: "Budget version approved successfully.",
      data: { budgetVersionId: input.budgetVersionId },
      correlationId: ctx.correlationId,
    };
  });
}

export interface CreateForecastVersionInput {
  tenantId: UUID;
  entityId: UUID;
  forecastCode: string;
  forecastName: string;
  fiscalYear: number;
  basisType?: "manual" | "budget_based" | "trend_based" | "scenario_based";
  versionNumber?: number;
  notes?: string;
}

export async function createForecastVersion(
  db: DbClient,
  ctx: ActionContext,
  input: CreateForecastVersionInput,
): Promise<ActionResult<{ forecastVersionId: UUID }>> {
  requirePermission(ctx, "forecast.manage");
  requireEntityScope(ctx, input.entityId);

  const result = await db.query<{ id: UUID }>(
    `
    insert into public.forecast_versions (
      tenant_id, entity_id, forecast_code, forecast_name, fiscal_year,
      forecast_status, version_number, basis_type, notes, created_by
    )
    values ($1,$2,$3,$4,$5,'draft',$6,$7,$8,$9)
    returning id
    `,
    [
      input.tenantId,
      input.entityId,
      input.forecastCode,
      input.forecastName,
      input.fiscalYear,
      input.versionNumber ?? 1,
      input.basisType ?? "manual",
      input.notes ?? null,
      ctx.platformUserId,
    ],
  );

  const forecastVersionId = result.rows[0].id;

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    entityId: input.entityId,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "forecasting",
    actionCode: "forecast.version.create",
    targetTable: "forecast_versions",
    targetRecordId: forecastVersionId,
    newValues: input,
  });

  return {
    success: true,
    message: "Forecast version created successfully.",
    data: { forecastVersionId },
    correlationId: ctx.correlationId,
  };
}

export interface UpsertForecastLineInput {
  tenantId: UUID;
  entityId: UUID;
  forecastVersionId: UUID;
  accountId?: UUID;
  departmentId?: UUID;
  costCenterId?: UUID;
  lineMonth: number;
  amount: number;
  driverType?: string;
  notes?: string;
}

export async function upsertForecastLine(
  db: DbClient,
  ctx: ActionContext,
  input: UpsertForecastLineInput,
): Promise<ActionResult<{ forecastLineId?: UUID }>> {
  requirePermission(ctx, "forecast.manage");
  requireEntityScope(ctx, input.entityId);

  const result = await db.query<{ id: UUID }>(
    `
    insert into public.forecast_lines (
      tenant_id, entity_id, forecast_version_id, account_id, department_id,
      cost_center_id, line_month, amount, driver_type, notes
    )
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    on conflict (
      forecast_version_id,
      coalesce(account_id, '00000000-0000-0000-0000-000000000000'::uuid),
      coalesce(department_id, '00000000-0000-0000-0000-000000000000'::uuid),
      coalesce(cost_center_id, '00000000-0000-0000-0000-000000000000'::uuid),
      line_month
    )
    do update set
      amount = excluded.amount,
      driver_type = excluded.driver_type,
      notes = excluded.notes,
      updated_at = timezone('utc', now())
    returning id
    `,
    [
      input.tenantId,
      input.entityId,
      input.forecastVersionId,
      input.accountId ?? null,
      input.departmentId ?? null,
      input.costCenterId ?? null,
      input.lineMonth,
      input.amount,
      input.driverType ?? null,
      input.notes ?? null,
    ],
  );

  const forecastLineId = result.rows[0]?.id;

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    entityId: input.entityId,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "forecasting",
    actionCode: "forecast.line.upsert",
    targetTable: "forecast_lines",
    targetRecordId: forecastLineId,
    newValues: input,
  });

  return {
    success: true,
    message: "Forecast line saved successfully.",
    data: { forecastLineId },
    correlationId: ctx.correlationId,
  };
}

export interface SaveScenarioInput {
  tenantId: UUID;
  entityId: UUID;
  forecastVersionId?: UUID;
  scenarioCode: string;
  scenarioName: string;
  driverCategory: "revenue" | "labor" | "payroll" | "contract" | "cash" | "inventory" | "other";
  inputKey: string;
  inputValueNumeric?: number;
  inputValueText?: string;
  notes?: string;
}

export async function saveScenarioInput(
  db: DbClient,
  ctx: ActionContext,
  input: SaveScenarioInput,
): Promise<ActionResult<{ scenarioInputId?: UUID }>> {
  requirePermission(ctx, "scenario.manage");
  requireEntityScope(ctx, input.entityId);

  const result = await db.query<{ id: UUID }>(
    `
    insert into public.scenario_inputs (
      tenant_id, entity_id, forecast_version_id, scenario_code, scenario_name,
      driver_category, input_key, input_value_numeric, input_value_text, notes
    )
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    on conflict (
      tenant_id,
      coalesce(entity_id, '00000000-0000-0000-0000-000000000000'::uuid),
      coalesce(forecast_version_id, '00000000-0000-0000-0000-000000000000'::uuid),
      scenario_code,
      input_key
    )
    do update set
      input_value_numeric = excluded.input_value_numeric,
      input_value_text = excluded.input_value_text,
      notes = excluded.notes,
      updated_at = timezone('utc', now())
    returning id
    `,
    [
      input.tenantId,
      input.entityId,
      input.forecastVersionId ?? null,
      input.scenarioCode,
      input.scenarioName,
      input.driverCategory,
      input.inputKey,
      input.inputValueNumeric ?? null,
      input.inputValueText ?? null,
      input.notes ?? null,
    ],
  );

  const scenarioInputId = result.rows[0]?.id;

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    entityId: input.entityId,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "forecasting",
    actionCode: "scenario.input.save",
    targetTable: "scenario_inputs",
    targetRecordId: scenarioInputId,
    newValues: input,
  });

  return {
    success: true,
    message: "Scenario input saved successfully.",
    data: { scenarioInputId },
    correlationId: ctx.correlationId,
  };
}

export interface GenerateVarianceSnapshotInput {
  tenantId: UUID;
  entityId: UUID;
  snapshotDate: string;
  comparisonType: "budget_vs_actual" | "forecast_vs_actual" | "budget_vs_forecast";
  budgetVersionId?: UUID;
  forecastVersionId?: UUID;
}

export async function generateVarianceSnapshot(
  db: DbClient,
  ctx: ActionContext,
  input: GenerateVarianceSnapshotInput,
): Promise<ActionResult<{ varianceSnapshotId: UUID }>> {
  requirePermission(ctx, "forecast.read");
  requireEntityScope(ctx, input.entityId);

  return db.transaction(async (tx) => {
    let snapshotJson: Record<string, unknown> = {};

    if (input.comparisonType === "budget_vs_forecast" && input.budgetVersionId && input.forecastVersionId) {
      const rows = await tx.query(
        `
        select
          coalesce(b.account_id, f.account_id) as account_id,
          coalesce(b.line_month, f.line_month) as line_month,
          coalesce(b.budget_amount, 0) as budget_amount,
          coalesce(f.forecast_amount, 0) as forecast_amount,
          coalesce(f.forecast_amount, 0) - coalesce(b.budget_amount, 0) as variance_amount
        from public.v_budget_line_summary b
        full outer join public.v_forecast_line_summary f
          on f.tenant_id = b.tenant_id
         and f.entity_id = b.entity_id
         and f.account_id is not distinct from b.account_id
         and f.department_id is not distinct from b.department_id
         and f.cost_center_id is not distinct from b.cost_center_id
         and f.line_month = b.line_month
        where (b.tenant_id = $1 or f.tenant_id = $1)
          and (b.entity_id = $2 or f.entity_id = $2)
          and (b.budget_version_id = $3 or b.budget_version_id is null)
          and (f.forecast_version_id = $4 or f.forecast_version_id is null)
        `,
        [input.tenantId, input.entityId, input.budgetVersionId, input.forecastVersionId],
      );
      snapshotJson = {"rows": rows.rows}
    } else {
      snapshotJson = {
        "message": "Comparison type scaffolded. Actuals-side comparison requires expanded GL actuals layer."
      }
    }

    const insert = await tx.query<{ id: UUID }>(
      `
      insert into public.variance_snapshots (
        tenant_id, entity_id, snapshot_date, comparison_type,
        budget_version_id, forecast_version_id, snapshot_json, generated_by
      )
      values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)
      on conflict (
        tenant_id, entity_id, snapshot_date, comparison_type,
        coalesce(budget_version_id, '00000000-0000-0000-0000-000000000000'::uuid),
        coalesce(forecast_version_id, '00000000-0000-0000-0000-000000000000'::uuid)
      )
      do update set
        snapshot_json = excluded.snapshot_json,
        generated_by = excluded.generated_by,
        generated_at = timezone('utc', now())
      returning id
      `,
      [
        input.tenantId,
        input.entityId,
        input.snapshotDate,
        input.comparisonType,
        input.budgetVersionId ?? null,
        input.forecastVersionId ?? null,
        JSON.stringify(snapshotJson),
        ctx.platformUserId,
      ],
    );

    const varianceSnapshotId = insert.rows[0].id;

    await writeAuditLog(tx, {
      tenantId: input.tenantId,
      entityId: input.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "forecasting",
      actionCode: "variance.snapshot.generate",
      targetTable: "variance_snapshots",
      targetRecordId: varianceSnapshotId,
      newValues: input,
    });

    return {
      success: true,
      message: "Variance snapshot generated successfully.",
      data: { varianceSnapshotId },
      correlationId: ctx.correlationId,
    };
  });
}
