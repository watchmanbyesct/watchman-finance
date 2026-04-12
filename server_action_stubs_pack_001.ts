// Watchman Finance Server Action Starter Pack 001 v1
// Foundation layer only.
// Replace db/auth/audit implementations with your actual app services.

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
    )
    values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11)
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

export interface BootstrapTenantInput {
  tenantSlug: string;
  legalName: string;
  displayName: string;
  timezone: string;
  firstEntityCode: string;
  firstEntityName: string;
  ownerPlatformUserId: UUID;
}

export async function bootstrapTenant(
  db: DbClient,
  ctx: ActionContext,
  input: BootstrapTenantInput,
): Promise<ActionResult<{ tenantId: UUID; entityId: UUID }>> {
  requirePermission(ctx, "tenant.update");

  return db.transaction(async (tx) => {
    const tenantRes = await tx.query<{ id: UUID }>(
      `
      insert into public.tenants (slug, legal_name, display_name, timezone)
      values ($1,$2,$3,$4)
      returning id
      `,
      [input.tenantSlug, input.legalName, input.displayName, input.timezone],
    );

    const tenantId = tenantRes.rows[0].id;

    const entityRes = await tx.query<{ id: UUID }>(
      `
      insert into public.entities (tenant_id, code, legal_name, display_name, entity_type, base_currency)
      values ($1,$2,$3,$4,'operating_company','USD')
      returning id
      `,
      [tenantId, input.firstEntityCode, input.firstEntityName, input.firstEntityName],
    );

    const entityId = entityRes.rows[0].id;

    await tx.query(
      `
      insert into public.tenant_memberships (tenant_id, platform_user_id, membership_status, default_entity_id, joined_at)
      values ($1,$2,'active',$3, timezone('utc', now()))
      on conflict (tenant_id, platform_user_id) do nothing
      `,
      [tenantId, input.ownerPlatformUserId, entityId],
    );

    await writeAuditLog(tx, {
      tenantId,
      entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "finance_core",
      actionCode: "tenant.bootstrap",
      targetTable: "tenants",
      metadata: input,
    });

    return {
      success: true,
      message: "Tenant bootstrapped successfully.",
      data: { tenantId, entityId },
      correlationId: ctx.correlationId,
    };
  });
}

export interface CreateEntityInput {
  tenantId: UUID;
  entityCode: string;
  legalName: string;
  displayName: string;
  entityType: string;
  baseCurrency: string;
}

export async function createEntity(
  db: DbClient,
  ctx: ActionContext,
  input: CreateEntityInput,
): Promise<ActionResult<{ entityId: UUID }>> {
  requirePermission(ctx, "entity.create");

  const result = await db.query<{ id: UUID }>(
    `
    insert into public.entities (tenant_id, code, legal_name, display_name, entity_type, base_currency)
    values ($1,$2,$3,$4,$5,$6)
    returning id
    `,
    [
      input.tenantId,
      input.entityCode,
      input.legalName,
      input.displayName,
      input.entityType,
      input.baseCurrency,
    ],
  );

  const entityId = result.rows[0].id;

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    entityId,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "finance_core",
    actionCode: "entity.create",
    targetTable: "entities",
    targetRecordId: entityId,
    newValues: input,
  });

  return {
    success: true,
    message: "Entity created successfully.",
    data: { entityId },
    correlationId: ctx.correlationId,
  };
}

export interface AssignUserRoleInput {
  tenantId: UUID;
  targetPlatformUserId: UUID;
  roleId: UUID;
}

export async function assignUserRole(
  db: DbClient,
  ctx: ActionContext,
  input: AssignUserRoleInput,
): Promise<ActionResult<{ assignmentId: UUID }>> {
  requirePermission(ctx, "user.role_assign");

  const result = await db.query<{ id: UUID }>(
    `
    insert into public.user_role_assignments (tenant_id, platform_user_id, role_id, assigned_by, status)
    values ($1,$2,$3,$4,'active')
    returning id
    `,
    [input.tenantId, input.targetPlatformUserId, input.roleId, ctx.platformUserId],
  );

  const assignmentId = result.rows[0].id;

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "finance_core",
    actionCode: "user.role_assign",
    targetTable: "user_role_assignments",
    targetRecordId: assignmentId,
    newValues: input,
  });

  return {
    success: true,
    message: "Role assigned successfully.",
    data: { assignmentId },
    correlationId: ctx.correlationId,
  };
}

export interface CreateAccountInput {
  tenantId: UUID;
  entityId: UUID;
  accountCategoryId: UUID;
  code: string;
  name: string;
  description?: string;
  parentAccountId?: UUID;
  accountType: string;
  normalBalance: "debit" | "credit";
  allowPosting: boolean;
}

export async function createAccount(
  db: DbClient,
  ctx: ActionContext,
  input: CreateAccountInput,
): Promise<ActionResult<{ accountId: UUID }>> {
  requirePermission(ctx, "gl.account.manage");
  requireEntityScope(ctx, input.entityId);

  const result = await db.query<{ id: UUID }>(
    `
    insert into public.accounts (
      tenant_id, entity_id, account_category_id, code, name, description,
      parent_account_id, account_type, normal_balance, allow_posting, is_active
    )
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true)
    returning id
    `,
    [
      input.tenantId,
      input.entityId,
      input.accountCategoryId,
      input.code,
      input.name,
      input.description ?? null,
      input.parentAccountId ?? null,
      input.accountType,
      input.normalBalance,
      input.allowPosting,
    ],
  );

  const accountId = result.rows[0].id;

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    entityId: input.entityId,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "finance_core",
    actionCode: "gl.account.create",
    targetTable: "accounts",
    targetRecordId: accountId,
    newValues: input,
  });

  return {
    success: true,
    message: "Account created successfully.",
    data: { accountId },
    correlationId: ctx.correlationId,
  };
}

export interface CreateFiscalPeriodInput {
  tenantId: UUID;
  entityId: UUID;
  periodName: string;
  startDate: string;
  endDate: string;
  fiscalYear: number;
  fiscalMonth?: number;
}

export async function createFiscalPeriod(
  db: DbClient,
  ctx: ActionContext,
  input: CreateFiscalPeriodInput,
): Promise<ActionResult<{ fiscalPeriodId: UUID }>> {
  requirePermission(ctx, "gl.account.manage");
  requireEntityScope(ctx, input.entityId);

  const result = await db.query<{ id: UUID }>(
    `
    insert into public.fiscal_periods (
      tenant_id, entity_id, period_name, start_date, end_date, fiscal_year, fiscal_month, status
    )
    values ($1,$2,$3,$4,$5,$6,$7,'open')
    returning id
    `,
    [
      input.tenantId,
      input.entityId,
      input.periodName,
      input.startDate,
      input.endDate,
      input.fiscalYear,
      input.fiscalMonth ?? null,
    ],
  );

  const fiscalPeriodId = result.rows[0].id;

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    entityId: input.entityId,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "finance_core",
    actionCode: "gl.period.create",
    targetTable: "fiscal_periods",
    targetRecordId: fiscalPeriodId,
    newValues: input,
  });

  return {
    success: true,
    message: "Fiscal period created successfully.",
    data: { fiscalPeriodId },
    correlationId: ctx.correlationId,
  };
}
